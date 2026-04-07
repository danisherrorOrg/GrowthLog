import pytest
import os
from fastapi.testclient import TestClient
from pymongo import MongoClient
from unittest.mock import patch, MagicMock

# Use a separate test database
os.environ["DB_NAME"] = "growthlog_test"

# CRITICAL: Mock send_email BEFORE any other imports to prevent real emails in tests
# (Other modules import this from utils.email, so we must patch it before they do)
mock_send_email = patch("utils.email.send_email").start()

from main import app
from core.database import db, client as mongo_client

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Ensure we start with a clean test database."""
    # Safety Check: Never drop the production DB
    if os.getenv("DB_NAME") != "growthlog_test":
        raise Exception(f"Refusing to run tests on database: {os.getenv('DB_NAME')}")
    
    # Drop existing test data
    mongo_client.drop_database("growthlog_test")
    yield
    # Optional: Keep data for manual inspection if needed, or cleanup here
    # mongo_client.drop_database("growthlog_test")

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def test_user_data():
    return {
        "name": "Test User",
        "email": f"test_{os.urandom(4).hex()}@example.com",
        "password": "Password123!"
    }

import httpx

@pytest.fixture
def auth_headers(client, test_user_data):
    """Register and login a user, then return headers with the token."""
    client.post("/auth/register", json=test_user_data)
    response = client.post("/auth/login", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    })
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def async_client():
    from httpx import AsyncClient
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
