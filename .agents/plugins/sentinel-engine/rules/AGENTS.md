# SENTINEL 2026 — DOMAIN INTELLIGENCE RULES

> [!IMPORTANT]
> These rules provide domain context for ALL agents working on the Sentinel 2026 platform.
> They supplement the directory-specific GEMINI.md rules with cross-cutting mission requirements.

## MISSION CONTEXT
You are building a statewide CCTV intelligence platform for Gujarat Police that federates 80,000+ cameras across 26 government departments into a unified surveillance and crime-detection network.

## THE 5-DATABASE CORRELATION ENGINE
Every ANPR detection must be correlated against ALL 5 databases:
1. **VAHAN** (National Vehicle Registry): stolen_flag, blacklist_status, owner lookup
2. **SARTHI** (Driver Licensing): license_status, suspended/disqualified driver alerts
3. **eGujCop** (Gujarat Police CCTNS): active FIRs, wanted criminals, missing persons
4. **AFIS** (State Fingerprint): biometric suspect records, arrest history
5. **NAFIS** (National Fingerprint): interstate fugitive cross-links

## THREAT LEVEL COLOR CODING (Mandatory)
- 🔴 **RED / CRITICAL**: Stolen vehicle OR wanted criminal (active warrant/absconding)
- 🟠 **AMBER / HIGH**: Suspended license, blacklisted vehicle, linked to open FIR
- 🟢 **GREEN / NORMAL**: Clean vehicle, no watchlist matches

Every alert MUST include a computed `threat_level` field.

## JURY ALIGNMENT (3 Bodies)
### NFSU (National Forensic Sciences University)
- SHA-256 hash on every snapshot at detection time
- Append-only forensic audit log (tamper-evident)
- PTS timestamps with cryptographic watermarks on exported clips
- Must be legally admissible under BSA / Indian Evidence Act

### DA-IICT (AI Research)
- mAP@50 > 92% on Indian HSRP plates
- Inference budget: sub-35ms edge (Jetson Orin), sub-15ms central (Tesla T4)
- Robustness: night glare, monsoon rain, motion blur, 45° overhead angles
- PTS-only Kalman tracking compliance

### Senior IPS & Police Command
- Color-coded threat priorities visible at a glance
- 1-click PCR van dispatch coordination cards
- Complete route reconstruction: chronological GIS trail with time, location, direction
- Plate search → instant trajectory overlay with all historical sightings

## VMS FEDERATION REQUIREMENT
Adapters for Milestone XProtect, Genetec Omnicast, and generic ONVIF/NVR must:
- Parse REAL vendor event formats (XML/JSON) from documentation samples
- Normalize to the unified `alert_event.json` contract
- NOT be empty stubs or mock pass-throughs

## THE CORE TEST CASE
`GET /api/vehicles/{plate_number}/trajectory` must return a chronological list of ALL sightings for a plate across ALL cameras with timestamps and GPS coordinates. This IS the jury evaluation endpoint. Every detection must be persisted to the `sightings` table.
