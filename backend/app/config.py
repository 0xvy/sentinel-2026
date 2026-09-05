import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

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

    model_config = SettingsConfigDict(env_prefix="SENTINEL_", case_sensitive=False)

settings = Settings()
