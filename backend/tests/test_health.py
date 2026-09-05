import time
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint_returns_200(client: AsyncClient):
    """Test GET /health returns 200 with correct JSON structure."""
    start = time.perf_counter()
    response = await client.get("/health")
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    assert "application/json" in response.headers.get("content-type", "")

    data = response.json()
    assert isinstance(data, dict), f"Expected JSON object, got {type(data)}"
    assert data.get("status") == "healthy", f"Expected status 'healthy', got {data.get('status')}"
    assert "service" in data, "Expected 'service' key in health response"
    assert "sentinel" in data["service"].lower(), f"Unexpected service name: {data['service']}"
    assert "version" in data, "Expected 'version' key in health response"
    assert data["version"] == "1.0.0"

    # Forensic requirement: Latency check (< 500ms)
    assert elapsed_ms < 500.0, f"Health check took too long: {elapsed_ms}ms"
