# BACKEND DIRECTORY RULES

> [!IMPORTANT]
> These rules apply to ALL agents working in `backend/`.

## DIRECTORY BOUNDARY
- You may ONLY create/edit files inside `backend/`. NEVER touch `vision/`, `frontend/`, or `docs/`.

## API CONTRACT ENFORCEMENT
- All API responses MUST conform to the JSON schemas in `contracts/`.
- The `alert_event.json` contract is the single source of truth for alert payloads.
- The `camera_registry.json` contract defines the Model 1 GIS camera response shape.
- The `trajectory_response.json` contract defines the vehicle trajectory endpoint shape.

## DATABASE RULES
- SQLite is the mock database engine. All 6 tables (vahan, sarthi, egujcop, afis, nafis, sightings) must be initialized on startup.
- Every vision detection MUST be persisted to the `sightings` table — not just emitted via WebSocket.
- The sightings table enables `GET /api/vehicles/{plate}/trajectory` — the CORE jury evaluation endpoint.

## VMS FEDERATION ADAPTERS
- Adapters in `backend/adapters/` must NOT be empty stubs.
- Each adapter MUST parse real vendor event formats (Milestone XML, Genetec JSON) and normalize to `alert_event.json`.
- Sample vendor payloads go in `backend/adapters/mock_payloads/`.

## AUTHENTICATION
- Sandbox auth uses `SENTINEL_SANDBOX_TOKEN` environment variable.
- Implement 401 auto-refresh logic for token expiry.
- Never hardcode auth tokens.

## FORENSIC COMPLIANCE
- SHA-256 hash every alert snapshot at detection time (NFSU chain-of-custody).
- Maintain an append-only tamper-evident audit log.
