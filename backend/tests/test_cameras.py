import jsonschema
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_cameras_returns_50_cameras(client: AsyncClient, load_contract_schema):
    """Test GET /api/cameras returns list of 50 cameras and conforms to contract."""
    response = await client.get("/api/cameras")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    cameras = response.json()
    assert isinstance(cameras, list), f"Expected list of cameras, got {type(cameras)}"
    assert len(cameras) == 50, f"Expected exactly 50 cameras across Gujarat, got {len(cameras)}"

    schema = load_contract_schema("camera_registry.json")

    # Validate each camera against contracts/camera_registry.json schema
    for cam in cameras:
        jsonschema.validate(instance=cam, schema=schema)


@pytest.mark.asyncio
async def test_cameras_required_fields_and_types(client: AsyncClient):
    """Test each camera has required fields: camera_id, camera_name, department, district, lat, lng, status."""
    response = await client.get("/api/cameras")
    assert response.status_code == 200
    cameras = response.json()

    required_fields = ["camera_id", "camera_name", "department", "district", "lat", "lng", "status"]

    for cam in cameras:
        for field in required_fields:
            assert field in cam, f"Camera missing required field '{field}': {cam}"
            assert cam[field] is not None, f"Field '{field}' should not be None: {cam}"

        # Verify camera ID pattern
        assert cam["camera_id"].startswith("CAM-"), f"Invalid camera_id format: {cam['camera_id']}"
        assert isinstance(cam["camera_name"], str) and len(cam["camera_name"]) > 0
        assert isinstance(cam["department"], str) and len(cam["department"]) > 0
        assert isinstance(cam["district"], str) and len(cam["district"]) > 0


@pytest.mark.asyncio
async def test_cameras_within_gujarat_bounds(client: AsyncClient):
    """Test all camera lat/lng coordinates are strictly within Gujarat geographic bounds."""
    response = await client.get("/api/cameras")
    assert response.status_code == 200
    cameras = response.json()

    # Gujarat Geographic Bounds per contract
    # Latitude: 20.0 to 24.5 N
    # Longitude: 68.0 to 74.5 E
    for cam in cameras:
        lat = cam["lat"]
        lng = cam["lng"]
        assert 20.0 <= lat <= 24.5, f"Camera {cam['camera_id']} lat {lat} out of Gujarat bounds (20.0-24.5)"
        assert 68.0 <= lng <= 74.5, f"Camera {cam['camera_id']} lng {lng} out of Gujarat bounds (68.0-74.5)"


@pytest.mark.asyncio
async def test_cameras_department_filter(client: AsyncClient):
    """Test department filter: GET /api/cameras?department=Police returns only Police cameras."""
    response = await client.get("/api/cameras?department=Police")
    assert response.status_code == 200
    police_cameras = response.json()

    assert isinstance(police_cameras, list)
    assert len(police_cameras) > 0, "Expected at least 1 Police camera"

    # Assert every camera returned belongs to Police
    for cam in police_cameras:
        assert cam["department"] == "Police", f"Expected department 'Police', got '{cam['department']}'"

    # Also test Transport (RTO) department filter
    rto_resp = await client.get("/api/cameras?department=Transport (RTO)")
    assert rto_resp.status_code == 200
    rto_cameras = rto_resp.json()
    assert len(rto_cameras) > 0
    for cam in rto_cameras:
        assert cam["department"] == "Transport (RTO)"


@pytest.mark.asyncio
async def test_cameras_status_filter(client: AsyncClient):
    """Test status filter: GET /api/cameras?status=Online returns only Online cameras."""
    response = await client.get("/api/cameras?status=Online")
    assert response.status_code == 200
    online_cameras = response.json()

    assert isinstance(online_cameras, list)
    assert len(online_cameras) > 0, "Expected at least 1 Online camera"

    for cam in online_cameras:
        assert cam["status"] == "Online", f"Expected status 'Online', got '{cam['status']}'"

    # Test Offline status filter
    offline_resp = await client.get("/api/cameras?status=Offline")
    assert offline_resp.status_code == 200
    offline_cameras = offline_resp.json()
    for cam in offline_cameras:
        assert cam["status"] == "Offline"


@pytest.mark.asyncio
async def test_cameras_multi_department_representation(client: AsyncClient):
    """Test that all key Gujarat government departments are represented in the 50 cameras."""
    response = await client.get("/api/cameras")
    assert response.status_code == 200
    cameras = response.json()

    departments = {c["department"] for c in cameras}
    expected_depts = {"Police", "Transport (RTO)", "GSRTC", "Municipal Corp", "Health", "Panchayat"}
    missing = expected_depts - departments
    assert not missing, f"Missing expected departments in camera registry: {missing}"
