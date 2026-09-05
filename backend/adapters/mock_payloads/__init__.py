from pathlib import Path

_PAYLOADS_DIR = Path(__file__).parent


def get_milestone_alarm_xml() -> str:
    """Read Milestone XProtect LPR alarm event XML sample."""
    return (_PAYLOADS_DIR / "milestone_alarm.xml").read_text(encoding="utf-8")


def get_milestone_analytics_xml() -> str:
    """Read Milestone XProtect motion analytics event XML sample."""
    return (_PAYLOADS_DIR / "milestone_analytics.xml").read_text(encoding="utf-8")


def get_genetec_lpr_json() -> str:
    """Read Genetec Omnicast AutoVu LPR read JSON sample."""
    return (_PAYLOADS_DIR / "genetec_lpr_event.json").read_text(encoding="utf-8")


def get_genetec_alarm_json() -> str:
    """Read Genetec Security Center alarm webhook JSON sample."""
    return (_PAYLOADS_DIR / "genetec_alarm_event.json").read_text(encoding="utf-8")


def get_onvif_analytics_xml() -> str:
    """Read ONVIF WS-BaseNotification analytics XML sample."""
    return (_PAYLOADS_DIR / "onvif_analytics.xml").read_text(encoding="utf-8")


def get_all_mock_payloads() -> dict[str, str]:
    """Retrieve all mock vendor payloads as a mapping of filename to string content."""
    return {
        "milestone_alarm.xml": get_milestone_alarm_xml(),
        "milestone_analytics.xml": get_milestone_analytics_xml(),
        "genetec_lpr_event.json": get_genetec_lpr_json(),
        "genetec_alarm_event.json": get_genetec_alarm_json(),
        "onvif_analytics.xml": get_onvif_analytics_xml(),
    }
