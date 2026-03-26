"""
Shared test fixtures for Viswa Sports backend.

Unit tests (test_security, test_payment, test_slot_service, test_hold_service)
don't need a database — they test pure logic.

Integration tests (test_api) require a running PostgreSQL instance and are
skipped by default. Run them with:  pytest -m integration
"""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.main import app


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    """
    HTTPX async client wired to the FastAPI app.
    Uses the real DB session (requires PostgreSQL running).
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
