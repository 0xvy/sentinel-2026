import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_search_partial_plate_returns_multiple(client: AsyncClient):
    """Test GET /api/search?plate=GJ01 returns multiple matching plates."""
    response = await client.get("/api/search?plate=GJ01")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    results = response.json()
    assert isinstance(results, list), f"Expected list of search results, got {type(results)}"
    assert len(results) > 1, f"Expected multiple matching plates for 'GJ01', got {len(results)}"

    # Check that plates in results contain GJ01
    plate_numbers = [item["plate_number"] for item in results]
    assert any("GJ01" in p for p in plate_numbers), f"Expected GJ01 in plates: {plate_numbers}"
    assert "GJ01ER8842" in plate_numbers, f"Expected suspect plate GJ01ER8842 in results: {plate_numbers}"


@pytest.mark.asyncio
async def test_search_exact_plate_match(client: AsyncClient):
    """Test GET /api/search?plate=GJ01ER8842 returns exact match with full metadata."""
    response = await client.get("/api/search?plate=GJ01ER8842")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    results = response.json()
    assert isinstance(results, list)
    assert len(results) >= 1, "Expected at least 1 match for exact plate"

    exact_item = next((r for r in results if r["plate_number"] == "GJ01ER8842"), None)
    assert exact_item is not None, f"Expected GJ01ER8842 in results: {results}"

    # Verify search summary fields
    assert exact_item["plate_number"] == "GJ01ER8842"
    assert exact_item["threat_level"] == "CRITICAL"
    assert exact_item["total_sightings"] >= 5
    assert exact_item.get("last_seen") is not None


@pytest.mark.asyncio
async def test_search_case_insensitive(client: AsyncClient):
    """Test search is case-insensitive (e.g. 'gj01er8842' finds 'GJ01ER8842')."""
    response = await client.get("/api/search?plate=gj01er8842")
    assert response.status_code == 200
    results = response.json()

    plates = [item["plate_number"] for item in results]
    assert "GJ01ER8842" in plates, f"Expected lowercase search to match uppercase plate, got {plates}"


@pytest.mark.asyncio
async def test_search_empty_query(client: AsyncClient):
    """Test empty query returns error or safe default list without crashing."""
    # Test with empty query param
    response = await client.get("/api/search?plate=")
    assert response.status_code in (200, 400, 422)
    if response.status_code == 200:
        results = response.json()
        assert isinstance(results, list)

    # Test without query param
    response_no_param = await client.get("/api/search")
    assert response_no_param.status_code in (200, 400, 422)
    if response_no_param.status_code == 200:
        results = response_no_param.json()
        assert isinstance(results, list)


@pytest.mark.asyncio
async def test_search_non_existent_plate(client: AsyncClient):
    """Test query with no matches returns empty list."""
    response = await client.get("/api/search?plate=ZZ99NOTFOUND99")
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) == 0


@pytest.mark.asyncio
async def test_search_limit_parameter(client: AsyncClient):
    """Test limit query parameter constrains result count."""
    response = await client.get("/api/search?plate=GJ&limit=3")
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) <= 3
