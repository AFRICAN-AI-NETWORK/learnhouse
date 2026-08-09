"""
Idempotency dependency tests.

Redis is stubbed with an in-memory double so the suite runs without infrastructure
while still exercising the real get/setex code paths.
"""

from unittest.mock import patch

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from src.core.idempotency import IdempotencyContext, idempotency


class FakeRedis:
    """Minimal stand-in covering the commands the dependency actually uses."""

    def __init__(self):
        self.store: dict[str, str] = {}
        self.expirations: dict[str, int] = {}

    def get(self, key: str):
        return self.store.get(key)

    def setex(self, key: str, ttl: int, value: str):
        self.store[key] = value
        self.expirations[key] = ttl


@pytest.fixture
def fake_redis():
    return FakeRedis()


@pytest.fixture
def client(fake_redis):
    app = FastAPI()
    call_counter = {"count": 0}

    @app.post("/write")
    def write(idem: IdempotencyContext = Depends(idempotency)):
        cached = idem.cached_response()
        if cached is not None:
            return cached

        call_counter["count"] += 1
        result = {"applied": True, "call_number": call_counter["count"]}
        idem.store(result)
        return result

    with patch("src.core.idempotency.get_redis_client", return_value=fake_redis):
        test_client = TestClient(app)
        test_client.call_counter = call_counter  # type: ignore[attr-defined]
        yield test_client


def test_request_without_a_key_is_unaffected(client):
    """Existing clients send no header and must see today's behaviour."""
    first = client.post("/write")
    second = client.post("/write")

    assert first.json()["call_number"] == 1
    assert second.json()["call_number"] == 2
    assert client.call_counter["count"] == 2


def test_replay_with_the_same_key_returns_the_original_response(client):
    headers = {"X-Idempotency-Key": "key-abc"}

    first = client.post("/write", headers=headers)
    second = client.post("/write", headers=headers)

    assert first.json() == second.json()
    # The handler body ran exactly once — this is the whole point.
    assert client.call_counter["count"] == 1


def test_distinct_keys_apply_separately(client):
    client.post("/write", headers={"X-Idempotency-Key": "key-1"})
    client.post("/write", headers={"X-Idempotency-Key": "key-2"})

    assert client.call_counter["count"] == 2


def test_keys_are_namespaced_per_caller(client, fake_redis):
    """
    The same key from two different callers must not collide, or one user could
    receive another user's response.
    """
    client.post(
        "/write",
        headers={"X-Idempotency-Key": "shared", "Authorization": "Bearer token-a"},
    )
    client.post(
        "/write",
        headers={"X-Idempotency-Key": "shared", "Authorization": "Bearer token-b"},
    )

    assert client.call_counter["count"] == 2
    assert len(fake_redis.store) == 2


def test_stored_keys_carry_a_ttl(client, fake_redis):
    client.post("/write", headers={"X-Idempotency-Key": "key-ttl"})

    assert all(ttl == 24 * 60 * 60 for ttl in fake_redis.expirations.values())


def test_token_is_never_stored_in_the_key(client, fake_redis):
    client.post(
        "/write",
        headers={
            "X-Idempotency-Key": "key-x",
            "Authorization": "Bearer super-secret-token",
        },
    )

    assert all("super-secret-token" not in key for key in fake_redis.store)


def test_degrades_gracefully_when_redis_is_down():
    """A cache outage must not turn into a write outage."""
    app = FastAPI()
    calls = {"count": 0}

    @app.post("/write")
    def write(idem: IdempotencyContext = Depends(idempotency)):
        if idem.cached_response() is not None:
            return {"cached": True}
        calls["count"] += 1
        idem.store({"applied": True})
        return {"applied": True}

    with patch("src.core.idempotency.get_redis_client", return_value=None):
        client = TestClient(app)
        first = client.post("/write", headers={"X-Idempotency-Key": "k"})
        second = client.post("/write", headers={"X-Idempotency-Key": "k"})

    # Both succeed; de-duplication is simply unavailable.
    assert first.status_code == 200
    assert second.status_code == 200
    assert calls["count"] == 2


def test_corrupt_cache_entry_is_treated_as_a_miss(client, fake_redis):
    client.post("/write", headers={"X-Idempotency-Key": "key-corrupt"})

    for key in list(fake_redis.store):
        fake_redis.store[key] = "{not valid json"

    response = client.post("/write", headers={"X-Idempotency-Key": "key-corrupt"})

    assert response.status_code == 200
    assert client.call_counter["count"] == 2
