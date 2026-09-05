# DOCS DIRECTORY RULES

> [!IMPORTANT]
> These rules apply to ALL agents working in `docs/`.

## DIRECTORY BOUNDARY
- You may ONLY create/edit files inside `docs/`. NEVER touch `backend/`, `vision/`, or `frontend/`.

## CONTENT STANDARDS
- **Quantitative Only**: Every claim must have a number. No hand-waving prose.
  - ❌ "The system is highly scalable" → ✅ "The system scales to 80,000 cameras with <5 Gbps metadata backhaul"
  - ❌ "Fast inference" → ✅ "Sub-35ms per frame on Jetson Orin, sub-15ms on Tesla T4"
- **Jury-Specific Sections**: Every document must explicitly address all 3 jury bodies:
  1. NFSU (forensic chain of custody, tamper-evident logs, SHA-256 hashing)
  2. DA-IICT (mAP@50, inference latency, robustness benchmarks)
  3. Senior IPS (actionable intelligence, PCR dispatch, route reconstruction)

## HLD REQUIREMENTS
- Must include bandwidth engineering math: 80,000 cams × 1080p × 15fps × H.265 = ~160 Gbps → edge analytics → <5 Gbps
- Must include storage tier architecture: NVMe hot (7-day), Ceph warm (30-day), tape cold (archive)
- Must include compute sizing: Jetson Orin edge + Tesla T4/A10G central
- Must include HA: N+1, multi-AZ, failover
- Must include security: TLS 1.3, RBAC, CJIS, BSA/Indian Evidence Act

## PRESENTATION REQUIREMENTS
- 15 slides maximum.
- Every slide must have a clear takeaway.
- Include architecture diagrams, not just bullet points.
