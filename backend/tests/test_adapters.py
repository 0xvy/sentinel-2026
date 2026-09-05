import json
from pathlib import Path
import pytest
import jsonschema

from adapters import (
    GenetecAdapter,
    MilestoneAdapter,
    ONVIFAdapter,
    get_adapter,
    normalize_plate,
    normalize_confidence,
    generate_alert_id,
    compute_snapshot_hash,
    infer_camera_dept,
)
from adapters.mock_payloads import (
    get_milestone_alarm_xml,
    get_milestone_analytics_xml,
    get_genetec_lpr_json,
    get_genetec_alarm_json,
    get_onvif_analytics_xml,
    get_all_mock_payloads,
)

# Load the official unified alert_event contract schema
CONTRACTS_DIR = Path(__file__).resolve().parent.parent.parent / "contracts"
ALERT_SCHEMA_PATH = CONTRACTS_DIR / "alert_event.json"


@pytest.fixture(scope="session")
def alert_schema() -> dict:
    with open(ALERT_SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


class TestNormalizationUtilities:
    """Tests for shared normalization utilities."""
    
    def test_normalize_plate(self):
        assert normalize_plate("GJ 01 ER 8842") == "GJ01ER8842"
        assert normalize_plate("GJ-01-ER-8842") == "GJ01ER8842"
        assert normalize_plate("gj 01 er 8842") == "GJ01ER8842"
        assert normalize_plate("GJ.01.ER.8842") == "GJ01ER8842"
        assert normalize_plate("  GJ01ER8842  ") == "GJ01ER8842"
        assert normalize_plate(None) == "UNKNOWN"
        assert normalize_plate("") == "UNKNOWN"

    def test_normalize_confidence(self):
        assert normalize_confidence(96.5) == 0.965
        assert normalize_confidence("96.5") == 0.965
        assert normalize_confidence(0.94) == 0.94
        assert normalize_confidence("0.94") == 0.94
        assert normalize_confidence(100.0) == 1.0
        assert normalize_confidence(0.0) == 0.0
        assert normalize_confidence("invalid", default=0.85) == 0.85

    def test_generate_alert_id(self):
        alert_id = generate_alert_id()
        assert alert_id.startswith("ALT-")
        parts = alert_id.split("-")
        assert len(parts) == 4
        assert len(parts[1]) == 4  # Year
        assert len(parts[2]) == 4  # MMDD
        assert len(parts[3]) == 4  # NNNN
        import re
        assert re.match(r"^ALT-[0-9]{4}-[0-9]{4}-[0-9]{4}$", alert_id)

    def test_compute_snapshot_hash(self):
        h1 = compute_snapshot_hash("https://example.com/snapshot.jpg")
        assert len(h1) == 64
        import re
        assert re.match(r"^[a-f0-9]{64}$", h1)
        h2 = compute_snapshot_hash(b"test_image_bytes")
        assert len(h2) == 64

    def test_infer_camera_dept(self):
        assert infer_camera_dept("CAM-RTO-VALSAD-04") == "Transport (RTO)"
        assert infer_camera_dept("CAM-AMC-AHM-01") == "Municipal Corp"
        assert infer_camera_dept("CAM-SMC-SURAT-02") == "Municipal Corp"
        assert infer_camera_dept("CAM-GSRTC-CEN-01") == "GSRTC"
        assert infer_camera_dept("CAM-POL-GND-01") == "Police"
        assert infer_camera_dept("CAM-UNKNOWN") == "Police"


class TestMilestoneAdapter:
    """Tests for Milestone XProtect Adapter."""

    def test_validate_and_normalize_alarm_xml(self, alert_schema):
        adapter = MilestoneAdapter()
        raw_xml = get_milestone_alarm_xml()
        
        assert adapter.validate_event(raw_xml) is True
        
        normalized = adapter.normalize_event(raw_xml)
        
        # Schema validation against contracts/alert_event.json
        jsonschema.validate(instance=normalized, schema=alert_schema)
        
        assert normalized["camera_id"] == "CAM-RTO-VALSAD-04"
        assert normalized["detected_plate"] == "GJ01ER8842"
        assert normalized["confidence"] == 0.94
        assert normalized["camera_lat"] == 20.6128
        assert normalized["camera_lng"] == 72.9314
        assert normalized["camera_dept"] == "Transport (RTO)"
        assert normalized["threat_level"] == "NORMAL"
        assert "VMS_FEDERATION_MILESTONE" in normalized["source_databases"]
        assert len(normalized["snapshot_hash_sha256"]) == 64

    def test_validate_and_normalize_analytics_xml(self, alert_schema):
        adapter = MilestoneAdapter()
        raw_xml = get_milestone_analytics_xml()
        
        assert adapter.validate_event(raw_xml) is True
        
        normalized = adapter.normalize_event(raw_xml)
        
        # Schema validation
        jsonschema.validate(instance=normalized, schema=alert_schema)
        
        assert normalized["camera_id"] == "CAM-SMC-SURAT-02"
        assert normalized["detected_plate"] == "GJ01ER8842"
        assert normalized["confidence"] == 0.88
        assert normalized["camera_lat"] == 21.1702
        assert normalized["camera_lng"] == 72.8311
        assert normalized["camera_dept"] == "Municipal Corp"

    def test_normalize_milestone_dict(self, alert_schema):
        adapter = MilestoneAdapter()
        dict_payload = {
            "EventHeader": {
                "ID": "test-guid-1234",
                "Timestamp": "2026-09-04T12:00:00Z",
                "Class": "LPR",
            },
            "EventBody": {
                "Source": {"DeviceId": "CAM-POL-AHM-05", "Name": "SG Highway East"},
                "Data": {"LicensePlate": "GJ01ER8842", "Confidence": 0.92},
                "GeoLocation": {"Latitude": 23.03, "Longitude": 72.58},
            },
        }
        
        assert adapter.validate_event(dict_payload) is True
        normalized = adapter.normalize_event(dict_payload)
        jsonschema.validate(instance=normalized, schema=alert_schema)
        assert normalized["camera_id"] == "CAM-POL-AHM-05"
        assert normalized["detected_plate"] == "GJ01ER8842"

    def test_invalid_payload(self):
        adapter = MilestoneAdapter()
        assert adapter.validate_event("<InvalidXML>") is False
        assert adapter.validate_event("") is False
        assert adapter.validate_event({}) is False


class TestGenetecAdapter:
    """Tests for Genetec Omnicast Adapter."""

    def test_validate_and_normalize_lpr_json(self, alert_schema):
        adapter = GenetecAdapter()
        raw_json = get_genetec_lpr_json()
        
        assert adapter.validate_event(raw_json) is True
        
        normalized = adapter.normalize_event(raw_json)
        
        # Schema validation against contracts/alert_event.json
        jsonschema.validate(instance=normalized, schema=alert_schema)
        
        assert normalized["camera_id"] == "CAM-AMC-AHM-01"
        assert normalized["detected_plate"] == "GJ01ER8842"
        assert normalized["confidence"] == 0.965  # 96.5% normalized to 0.965
        assert normalized["camera_lat"] == 23.0225
        assert normalized["camera_lng"] == 72.5714
        assert normalized["camera_dept"] == "Municipal Corp"
        assert normalized["threat_level"] == "NORMAL"
        assert "VMS_FEDERATION_GENETEC" in normalized["source_databases"]
        assert len(normalized["snapshot_hash_sha256"]) == 64

    def test_validate_and_normalize_alarm_json(self, alert_schema):
        adapter = GenetecAdapter()
        raw_json = get_genetec_alarm_json()
        
        assert adapter.validate_event(raw_json) is True
        
        normalized = adapter.normalize_event(raw_json)
        
        # Schema validation
        jsonschema.validate(instance=normalized, schema=alert_schema)
        
        assert normalized["camera_id"] == "CAM-POL-GND-01"
        assert normalized["detected_plate"] == "GJ01ER8842"
        assert normalized["confidence"] == 0.92  # 92.0 normalized to 0.92
        assert normalized["camera_lat"] == 23.2156
        assert normalized["camera_lng"] == 72.6369
        assert normalized["camera_dept"] == "Police"

    def test_invalid_payload(self):
        adapter = GenetecAdapter()
        assert adapter.validate_event("not-a-json") is False
        assert adapter.validate_event("") is False
        assert adapter.validate_event({"UnrelatedKey": 123}) is False


class TestONVIFAdapter:
    """Tests for Generic ONVIF / NVR Adapter."""

    def test_validate_and_normalize_analytics_xml(self, alert_schema):
        adapter = ONVIFAdapter()
        raw_xml = get_onvif_analytics_xml()
        
        assert adapter.validate_event(raw_xml) is True
        
        normalized = adapter.normalize_event(raw_xml)
        
        # Schema validation against contracts/alert_event.json
        jsonschema.validate(instance=normalized, schema=alert_schema)
        
        assert normalized["camera_id"] == "CAM-POL-VAD-03"
        assert normalized["detected_plate"] == "GJ01ER8842"
        assert normalized["confidence"] == 0.95
        assert normalized["camera_lat"] == 22.3072
        assert normalized["camera_lng"] == 73.1812
        assert normalized["camera_dept"] == "Police"
        assert normalized["threat_level"] == "NORMAL"
        assert "VMS_FEDERATION_ONVIF_NVR" in normalized["source_databases"]
        assert len(normalized["snapshot_hash_sha256"]) == 64

    def test_normalize_onvif_dict(self, alert_schema):
        adapter = ONVIFAdapter()
        dict_payload = {
            "CameraId": "CAM-RTO-SURAT-01",
            "LicensePlate": "GJ 01 ER 8842",
            "Confidence": 0.91,
            "Latitude": 21.19,
            "Longitude": 72.82,
            "Topic": "VehicleDetector",
        }
        
        assert adapter.validate_event(dict_payload) is True
        normalized = adapter.normalize_event(dict_payload)
        jsonschema.validate(instance=normalized, schema=alert_schema)
        assert normalized["camera_id"] == "CAM-RTO-SURAT-01"
        assert normalized["detected_plate"] == "GJ01ER8842"
        assert normalized["camera_dept"] == "Transport (RTO)"


class TestAdapterLifecycleAndFactory:
    """Tests for VMS adapter lifecycle and factory instantiation."""

    def test_factory_instantiation(self):
        milestone = get_adapter("Milestone")
        assert isinstance(milestone, MilestoneAdapter)
        
        genetec = get_adapter("Genetec")
        assert isinstance(genetec, GenetecAdapter)
        
        onvif = get_adapter("ONVIF_NVR")
        assert isinstance(onvif, ONVIFAdapter)

        with pytest.raises(ValueError, match="Unsupported VMS vendor"):
            get_adapter("UnknownVendor")

    @pytest.mark.asyncio
    async def test_milestone_lifecycle(self):
        adapter = MilestoneAdapter()
        assert adapter.is_connected is False
        
        connected = await adapter.connect(host="10.0.0.1", port=7563)
        assert connected is True
        assert adapter.is_connected is True
        
        # Buffer an event and fetch it
        adapter.queue_event(get_milestone_alarm_xml())
        events = await adapter.fetch_events()
        assert len(events) == 1
        assert events[0]["detected_plate"] == "GJ01ER8842"
        
        await adapter.disconnect()
        assert adapter.is_connected is False

    @pytest.mark.asyncio
    async def test_genetec_lifecycle(self):
        adapter = GenetecAdapter()
        assert adapter.is_connected is False
        
        connected = await adapter.connect()
        assert connected is True
        assert adapter.is_connected is True
        
        adapter.queue_event(get_genetec_lpr_json())
        events = await adapter.fetch_events()
        assert len(events) == 1
        assert events[0]["detected_plate"] == "GJ01ER8842"
        
        await adapter.disconnect()
        assert adapter.is_connected is False

    @pytest.mark.asyncio
    async def test_onvif_lifecycle(self):
        adapter = ONVIFAdapter()
        assert adapter.is_connected is False
        
        connected = await adapter.connect()
        assert connected is True
        assert adapter.is_connected is True
        
        adapter.queue_event(get_onvif_analytics_xml())
        events = await adapter.fetch_events()
        assert len(events) == 1
        assert events[0]["detected_plate"] == "GJ01ER8842"
        
        await adapter.disconnect()
        assert adapter.is_connected is False

    def test_all_mock_payloads_loader(self):
        all_payloads = get_all_mock_payloads()
        assert len(all_payloads) == 5
        assert "milestone_alarm.xml" in all_payloads
        assert "milestone_analytics.xml" in all_payloads
        assert "genetec_lpr_event.json" in all_payloads
        assert "genetec_alarm_event.json" in all_payloads
        assert "onvif_analytics.xml" in all_payloads
