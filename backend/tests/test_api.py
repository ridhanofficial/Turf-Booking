"""
Integration tests for the Viswa Sports API.

These tests require a running PostgreSQL and Redis instance.
They are SKIPPED by default. Run with:

    pytest -m integration

"""
import pytest


pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_health_check(client):
    """GET /health should return 200 with status ok."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_firebase_verify_invalid_token(client):
    """POST /auth/firebase-verify with a bogus token should return 401."""
    response = await client.post(
        "/auth/firebase-verify",
        json={"id_token": "invalid.token.here"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_booking_unauthenticated(client):
    """POST /bookings without auth header should return 403."""
    response = await client.post(
        "/bookings",
        json={"turf_id": 1, "date": "2026-04-01", "slot_ids": [1]},
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_my_bookings_unauthenticated(client):
    """GET /bookings/me without auth header should return 403."""
    response = await client.get("/bookings/me")
    assert response.status_code in (401, 403)
