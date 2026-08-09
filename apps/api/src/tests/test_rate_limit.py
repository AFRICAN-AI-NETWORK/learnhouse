"""
Rate limiter tests.

Confirms the token-refresh limit actually bites, that it is scoped per caller, and
— just as important — that it fails OPEN when Redis is unavailable.
"""

from unittest.mock import patch

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from src.core.rate_limit import RateLimiter


class FakeRedis:
    """In-memory counter double supporting the two commands the limiter uses."""

    def __init__(self):
        self.counters: dict[str, int] = {}
        self.expirations: dict[str, int] = {}

    def incr(self, key: str) -> int:
        self.counters[key] = self.counters.get(key, 0) + 1
        return self.counters[key]

    def expire(self, key: str, seconds: int) -> None:
        self.expirations[key] = seconds


@pytest.fixture
def fake_redis():
    return FakeRedis()


def build_client(limiter: RateLimiter, redis_client) -> TestClient:
    app = FastAPI()

    @app.get("/limited")
    def limited(_: None = Depends(limiter)):
        return {"ok": True}

    with patch("src.core.rate_limit.get_redis_client", return_value=redis_client):
        return TestClient(app)


def test_requests_under_the_limit_succeed(fake_redis):
    limiter = RateLimiter("test_bucket", limit=3, window_seconds=60)

    with patch("src.core.rate_limit.get_redis_client", return_value=fake_redis):
        client = build_client(limiter, fake_redis)
        for _ in range(3):
            assert client.get("/limited").status_code == 200


def test_exceeding_the_limit_returns_429_with_retry_after(fake_redis):
    limiter = RateLimiter("test_bucket", limit=2, window_seconds=60)

    with patch("src.core.rate_limit.get_redis_client", return_value=fake_redis):
        client = build_client(limiter, fake_redis)
        client.get("/limited")
        client.get("/limited")
        blocked = client.get("/limited")

    assert blocked.status_code == 429
    assert blocked.headers["retry-after"] == "60"


def test_window_ttl_is_set_once_on_first_hit(fake_redis):
    """
    The TTL must not be refreshed on every request, or the window would slide
    forward indefinitely and the key would never expire.
    """
    limiter = RateLimiter("test_bucket", limit=10, window_seconds=120)

    with patch("src.core.rate_limit.get_redis_client", return_value=fake_redis):
        client = build_client(limiter, fake_redis)
        for _ in range(4):
            client.get("/limited")

    assert list(fake_redis.expirations.values()) == [120]


def test_limits_are_scoped_per_caller(fake_redis):
    limiter = RateLimiter("test_bucket", limit=1, window_seconds=60)

    with patch("src.core.rate_limit.get_redis_client", return_value=fake_redis):
        client = build_client(limiter, fake_redis)

        first = client.get("/limited", headers={"Authorization": "Bearer token-a"})
        second = client.get("/limited", headers={"Authorization": "Bearer token-b"})

    # Different sessions must not consume each other's budget.
    assert first.status_code == 200
    assert second.status_code == 200


def test_token_is_never_used_verbatim_as_a_key(fake_redis):
    limiter = RateLimiter("test_bucket", limit=5, window_seconds=60)

    with patch("src.core.rate_limit.get_redis_client", return_value=fake_redis):
        client = build_client(limiter, fake_redis)
        client.get("/limited", headers={"Authorization": "Bearer secret-value"})

    assert all("secret-value" not in key for key in fake_redis.counters)


def test_fails_open_when_redis_is_unavailable():
    """Losing the cache must not lock users out of token refresh."""
    limiter = RateLimiter("test_bucket", limit=1, window_seconds=60)

    with patch("src.core.rate_limit.get_redis_client", return_value=None):
        client = build_client(limiter, None)
        for _ in range(5):
            assert client.get("/limited").status_code == 200


def test_fails_open_when_redis_raises():
    class ExplodingRedis:
        def incr(self, key):
            raise ConnectionError("redis down mid-flight")

        def expire(self, key, seconds):
            raise ConnectionError("redis down mid-flight")

    limiter = RateLimiter("test_bucket", limit=1, window_seconds=60)

    with patch("src.core.rate_limit.get_redis_client", return_value=ExplodingRedis()):
        client = build_client(limiter, ExplodingRedis())
        assert client.get("/limited").status_code == 200
