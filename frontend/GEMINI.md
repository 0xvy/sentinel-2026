# FRONTEND DIRECTORY RULES

> [!IMPORTANT]
> These rules apply to ALL agents working in `frontend/`.

## DIRECTORY BOUNDARY
- You may ONLY create/edit files inside `frontend/`. NEVER touch `backend/`, `vision/`, or `docs/`.

## 3-PASS UI DESIGN POLICY (MANDATORY)
All UI work MUST follow the Anti-Mixing Law from the Universal UI Design Policy:

### Pass 1: Creative Direction & Architecture
- Layout architecture, visual hierarchy, distinctive typography, color tokens.
- Dark-mode police tactical theme: deep slate #0a0f1d, amber/cyan indicators.
- Establish a strong POV. No generic cookie-cutter templates.

### Pass 2: Ruthless Audit & Polish
- Contrast verification (WCAG AA minimum).
- Spacing rhythm (4px/8px scale).
- Typography: monospace for plate numbers, proportional for labels.
- Active/focus states on ALL interactive elements.
- DO NOT destroy Pass 1 direction.

### Pass 3: Motion & Micro-Interactions
- Spring physics for alert card animations.
- Pulsing radar markers for active cameras.
- Animated polyline for vehicle breadcrumb trails.
- `:active` press-down scale on buttons.
- DO NOT alter colors, layouts, or spacing from Pass 2.

## API INTEGRATION
- Backend base URL comes from environment variable `VITE_API_URL`.
- Vehicle trajectory: `GET /api/vehicles/{plate}/trajectory` — this is the CORE jury test case.
- Live alerts: WebSocket at `/ws/alerts`.
- Camera registry: `GET /api/cameras`.

## ANTI-SLOP CHECKLIST
- ❌ BANNED: Centered hero with generic purple gradient, 3 identical rounded cards, vague placeholder copy.
- ✅ REQUIRED: Real visual hierarchy, tactile feedback on pointer-down, intentional typographic contrast.
