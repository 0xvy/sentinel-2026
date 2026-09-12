import asyncio
import json
import os
import sys
from pathlib import Path
import pytest
import pytest_asyncio
import aiosqlite

# Disable live RTSP pre-warming daemon threads during pytest execution
os.environ["SENTINEL_PREWARM"] = "0"

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from httpx import AsyncClient, ASGITransport


@pytest.fixture(scope="session")
def event_loop():
    """Create a session-scoped event loop for async test execution."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def seed_test_database():
    """Ensure SQLite tables and seed data are initialized before any tests run."""
    from app.config import settings
    from db.database import init_db
    from db.seed import seed_database

    await init_db(settings.DB_PATH)
    await seed_database(settings.DB_PATH)


@pytest_asyncio.fixture
async def client():
    """Create async test client with seeded database."""
    from app.main import app
    from app.config import settings
    from db.database import init_db
    from db.seed import seed_database

    # Guarantee DB is ready
    await init_db(settings.DB_PATH)
    await seed_database(settings.DB_PATH)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def db_conn():
    """Direct aiosqlite connection to test database."""
    from app.config import settings

    conn = await aiosqlite.connect(settings.DB_PATH)
    conn.row_factory = aiosqlite.Row
    try:
        yield conn
    finally:
        await conn.close()


@pytest.fixture(scope="session")
def contracts_dir() -> Path:
    """Path to contracts/ directory containing official JSON schemas."""
    return Path(__file__).resolve().parent.parent.parent / "contracts"


@pytest.fixture(scope="session")
def load_contract_schema(contracts_dir):
    """Helper function to load and parse a contract JSON schema."""
    def _loader(schema_name: str) -> dict:
        schema_file = contracts_dir / schema_name
        if not schema_file.exists():
            raise FileNotFoundError(f"Contract schema not found: {schema_file}")
        with open(schema_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return _loader
