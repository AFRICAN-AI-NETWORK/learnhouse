"""
Offline-support middleware tests.

Covers the ETag/conditional-GET and Cache-Control middlewares in isolation, using a
minimal app rather than the full API. That keeps the tests fast and free of
database or Redis dependencies while still exercising real request/response cycles
through the actual middleware stack — including GZip, whose ordering relative to
ETag matters.
"""

import pytest
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.testclient import TestClient

from src.core.middleware.cache_control import CacheControlMiddleware
from src.core.middleware.etag import ETagMiddleware


@pytest.fixture(scope="module")
def client() -> TestClient:
    app = FastAPI()

    # Same registration order as apps/api/app.py: GZip added last so it is the
    # outermost layer and ETag hashes the uncompressed body.
    app.add_middleware(CacheControlMiddleware)
    app.add_middleware(ETagMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    @app.get("/api/v1/courses/{course_uuid}/meta")
    def course_meta(course_uuid: str):
        return {"course_uuid": course_uuid, "name": "Test Course"}

    @app.post("/api/v1/courses/")
    def create_course():
        return {"created": True}

    @app.get("/api/v1/trail/org_slug/{slug}")
    def trail(slug: str):
        return {"slug": slug, "runs": []}

    @app.get("/api/v1/payments/{org_id}/config")
    def payments(org_id: int):
        return {"provider": "test"}

    @app.get("/api/v1/ee/audit_logs/")
    def audit_logs():
        return {"logs": []}

    return TestClient(app)


class TestETag:
    def test_eligible_get_receives_an_etag(self, client: TestClient):
        response = client.get("/api/v1/courses/abc/meta")

        assert response.status_code == 200
        assert response.headers.get("etag", "").startswith('W/"')

    def test_body_is_unchanged_by_the_middleware(self, client: TestClient):
        """Behaviour preservation: adding a validator must not alter payloads."""
        response = client.get("/api/v1/courses/abc/meta")

        assert response.json() == {"course_uuid": "abc", "name": "Test Course"}

    def test_matching_validator_returns_304_with_no_body(self, client: TestClient):
        first = client.get("/api/v1/courses/abc/meta")
        etag = first.headers["etag"]

        second = client.get("/api/v1/courses/abc/meta", headers={"If-None-Match": etag})

        assert second.status_code == 304
        assert second.content == b""
        # The client must keep its freshness contract across a 304.
        assert "cache-control" in second.headers

    def test_stale_validator_returns_the_full_body(self, client: TestClient):
        response = client.get(
            "/api/v1/courses/abc/meta", headers={"If-None-Match": 'W/"stale"'}
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Test Course"

    def test_wildcard_validator_matches(self, client: TestClient):
        response = client.get(
            "/api/v1/courses/abc/meta", headers={"If-None-Match": "*"}
        )

        assert response.status_code == 304

    def test_validator_list_is_honoured(self, client: TestClient):
        etag = client.get("/api/v1/courses/abc/meta").headers["etag"]

        response = client.get(
            "/api/v1/courses/abc/meta",
            headers={"If-None-Match": f'W/"other", {etag}'},
        )

        assert response.status_code == 304

    def test_different_content_yields_a_different_etag(self, client: TestClient):
        first = client.get("/api/v1/courses/one/meta").headers["etag"]
        second = client.get("/api/v1/courses/two/meta").headers["etag"]

        assert first != second

    def test_sensitive_routes_never_receive_a_validator(self, client: TestClient):
        """S1: no ETag is minted for payment or admin responses."""
        assert "etag" not in client.get("/api/v1/payments/1/config").headers
        assert "etag" not in client.get("/api/v1/ee/audit_logs/").headers

    def test_writes_are_not_given_an_etag(self, client: TestClient):
        assert "etag" not in client.post("/api/v1/courses/").headers


class TestCacheControl:
    def test_mutations_are_never_stored(self, client: TestClient):
        response = client.post("/api/v1/courses/")

        assert "no-store" in response.headers["cache-control"]

    def test_sensitive_reads_are_never_stored(self, client: TestClient):
        for path in ("/api/v1/payments/1/config", "/api/v1/ee/audit_logs/"):
            assert "no-store" in client.get(path).headers["cache-control"]

    def test_org_content_is_publicly_cacheable(self, client: TestClient):
        header = client.get("/api/v1/courses/abc/meta").headers["cache-control"]

        assert "public" in header
        assert "stale-while-revalidate" in header

    def test_user_scoped_reads_are_private(self, client: TestClient):
        header = client.get("/api/v1/trail/org_slug/default").headers["cache-control"]

        assert "private" in header
        assert "public" not in header
