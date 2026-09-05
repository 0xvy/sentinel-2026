from typing import Optional

from adapters.base import (
    VMSAdapter,
    compute_snapshot_hash,
    generate_alert_id,
    infer_camera_dept,
    normalize_confidence,
    normalize_plate,
)
from adapters.genetec import GenetecAdapter
from adapters.milestone import MilestoneAdapter
from adapters.onvif_nvr import ONVIFAdapter

__all__ = [
    "VMSAdapter",
    "MilestoneAdapter",
    "GenetecAdapter",
    "ONVIFAdapter",
    "get_adapter",
    "normalize_plate",
    "normalize_confidence",
    "generate_alert_id",
    "compute_snapshot_hash",
    "infer_camera_dept",
]


def get_adapter(vendor: str, config: Optional[dict] = None) -> VMSAdapter:
    """Factory to instantiate vendor-specific VMS adapter.
    
    Supported vendors:
    - 'Milestone' / 'Milestone_XProtect'
    - 'Genetec' / 'Genetec_Omnicast'
    - 'ONVIF_NVR' / 'ONVIF' / 'NVR'
    """
    v = (vendor or "").strip().upper().replace(" ", "_")
    if "MILESTONE" in v:
        return MilestoneAdapter(config=config)
    elif "GENETEC" in v:
        return GenetecAdapter(config=config)
    elif any(k in v for k in ("ONVIF", "NVR", "ANALOG")):
        return ONVIFAdapter(config=config)
    else:
        raise ValueError(
            f"Unsupported VMS vendor: '{vendor}'. Supported vendors: Milestone, Genetec, ONVIF_NVR"
        )
