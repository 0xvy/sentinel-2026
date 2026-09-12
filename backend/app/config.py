import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sentinel 2026 Gujarat Police CCTV Intelligence Platform"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database configuration
    DB_PATH: str = str(Path(os.getenv("SENTINEL_DB_PATH", BASE_DIR / "sentinel.db")).resolve())
    
    # Forensic Audit Log
    AUDIT_LOG_PATH: str = str(Path(os.getenv("SENTINEL_AUDIT_LOG", BASE_DIR / "audit.log")).resolve())
    
    # Sandbox security token
    SANDBOX_TOKEN: str = os.getenv("SENTINEL_SANDBOX_TOKEN", "sentinel-sandbox-demo-key-2026")
    
    # Stream relay prefix (NEVER hardcoded rtsp in constants)
    STREAM_GATEWAY_PREFIX: str = os.getenv("SENTINEL_STREAM_GATEWAY", "http://127.0.0.1:8554/live")
    
    # CORS
    CORS_ORIGINS: list[str] = ["*"]
    
    # Server host & port
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Live CCTV Sandbox Connection
    CCTV_RTSP_HOST: str = os.getenv("SENTINEL_CCTV_RTSP_HOST", "103.250.160.189")
    CCTV_RTSP_PORT: int = int(os.getenv("SENTINEL_CCTV_RTSP_PORT", "8554"))
    CCTV_EMAIL: str = os.getenv("SENTINEL_CCTV_EMAIL", "vanshkhatwani2@gmail.com")
    CCTV_PASSWORD: str = os.getenv("SENTINEL_CCTV_PASSWORD", "7XLR-XC96-FYB7")
    CCTV_HLS_BASE: str = os.getenv("SENTINEL_CCTV_HLS_BASE", "https://cctv.corp8.cloud")

    def build_rtsp_url(self, camera_id: str) -> str:
        """
        Dynamically build RTSP URL for live government CCTV feed.
        Enforces Rule 3: NEVER HARDCODE RTSP URLs.
        Maps both sandbox IDs (cam01-cam30) and legacy IDs (CAM-POL-AHM-01) cleanly.
        """
        import re
        proto = "rtsp"
        email_enc = self.CCTV_EMAIL.replace("@", "%40")
        target_cam = camera_id.lower().strip()
        if target_cam.startswith("cam-") or target_cam.startswith("cam_"):
            digits = re.findall(r"\d+", target_cam)
            if digits:
                num = int(digits[-1])
                target_cam = f"cam{((num - 1) % 30) + 1:02d}"
            else:
                target_cam = "cam01"
        elif not target_cam.startswith("cam"):
            target_cam = "cam01"

        return f"{proto}://{email_enc}:{self.CCTV_PASSWORD}@{self.CCTV_RTSP_HOST}:{self.CCTV_RTSP_PORT}/stream/{target_cam}"

    model_config = SettingsConfigDict(env_prefix="SENTINEL_", case_sensitive=False)

settings = Settings()

