# THE SENTINEL AI ENGINEERING ENGINE
## How We Wire Antigravity 2.0's Native Harness Into Our Orchestration

> [!IMPORTANT]
> This document is NOT about the hackathon project architecture. It is about the **meta-engineering layer** — the machine that controls HOW the AI builds the project. Every Antigravity 2.0 primitive is mapped to a specific failure mode it eliminates.

---

## The Problem We're Solving

Every competitor has access to frontier AI models. Where teams die:

| AI Failure Mode | What Actually Happens | When It Hits |
| :--- | :--- | :--- |
| **Context Rot** | At 30k+ tokens, the AI forgets the `/resource` RTSP TCP-only rule, starts using UDP or `CAP_PROP_FPS` | Mid-sprint, day 2+ |
| **Silent Regression** | AI fixes a camera bug but secretly breaks the watchlist query logic | After any multi-file edit |
| **Contract Desync** | Vision engine emits `{plate: "GJ01AB1234"}`, frontend expects `{plate_number: "GJ01AB1234"}` | When pillars integrate |
| **Circular Debug Trap** | AI patches error A → creates error B → patches B → creates C → spaghetti | Any complex dependency chain |
| **Constraint Amnesia** | AI uses hardcoded RTSP URLs, wall-clock timestamps, or crashes on POC decode warnings | Any new file or module |

**Our engine eliminates ALL of these by wiring Antigravity's native primitives as automated guardrails.**

---

## LAYER 1: WORKSPACE RULES — The Unkillable Memory

### What It Is (Antigravity Native)
`GEMINI.md` / `AGENTS.md` files placed in any directory. Antigravity walks up from the current working directory to the repo root and **injects these rules into the system prompt on EVERY SINGLE TURN**. They cannot be forgotten. They cannot be truncated. They survive context flushes, new conversations, and subagent spawns.

### How We Leverage It

We place a `GEMINI.md` at the project root (`sentinel_2026/GEMINI.md`) containing the 8 Official Sandbox Commandments as **hard machine-readable rules**, not prose suggestions:

```
sentinel_2026/
├── GEMINI.md              ← ROOT RULES (injected into EVERY agent touching this workspace)
├── backend/
│   └── GEMINI.md          ← BACKEND-SPECIFIC rules (only injected when working in /backend)
├── vision/
│   └── GEMINI.md          ← VISION-SPECIFIC rules (PTS timing, tracker constraints)
├── frontend/
│   └── GEMINI.md          ← FRONTEND-SPECIFIC rules (UI design policy, pass isolation)
└── docs/
    └── GEMINI.md          ← DOCS-SPECIFIC rules (HLD formatting, no handwaving)
```

**Root `GEMINI.md`** contains:
- ❌ NEVER use UDP for RTSP. Always set `OPENCV_FFMPEG_CAPTURE_OPTIONS = "rtsp_transport;tcp"` before importing cv2.
- ❌ NEVER use `CAP_PROP_FPS` or wall-clock `time.time()` for timing. Use `cap.get(cv2.CAP_PROP_POS_MSEC)` exclusively.
- ❌ NEVER hardcode RTSP stream URLs. Always query `GET /api/ingest` dynamically.
- ❌ NEVER crash on H.264/H.265 join decode warnings (RPS, POC). They are non-fatal.
- ✅ ALWAYS implement exponential backoff reconnection (2s initial, 30s max).
- ✅ ALWAYS handle 12-hour feed loop discontinuities (abrupt PTS resets) without tracker explosion.
- ✅ ALWAYS pace stream load — only open captures being actively processed.

**Backend `GEMINI.md`** adds:
- You may ONLY create/edit files inside `backend/`. Never touch `vision/`, `frontend/`, or `docs/`.
- All API responses must conform to the schemas in `contracts/`.

**Vision `GEMINI.md`** adds:
- You may ONLY create/edit files inside `vision/`. Never touch `backend/`, `frontend/`, or `docs/`.
- Kalman filter state must reset cleanly on PTS discontinuity (delta > 5000ms between consecutive frames = scene loop).

**Frontend `GEMINI.md`** adds:
- You may ONLY create/edit files inside `frontend/`. Never touch `backend/`, `vision/`, or `docs/`.
- Follow the 3-Pass UI Policy: Pass 1 (Creative Direction) → Pass 2 (Impeccable Audit) → Pass 3 (Motion Polish). Never blend passes.

### What Failure Mode This Kills
**Context Rot and Constraint Amnesia → DEAD.** Even if you flush context, open a new conversation, or spawn a subagent against this workspace, the rules are re-injected automatically. The AI literally cannot forget them.

---

## LAYER 2: LIFECYCLE HOOKS — The Automated Gatekeeper

### What It Is (Antigravity Native)
`hooks.json` placed in `.agents/hooks.json`. Hooks fire shell commands at specific lifecycle points:
- **`PreToolUse`**: Runs BEFORE any tool executes. Can **block** (`deny`), **allow**, or **modify** the tool call.
- **`PostToolUse`**: Runs AFTER a tool completes. Can trigger cleanup, linting, or validation.
- **`PreInvocation`**: Runs before the model is called each turn. Can inject ephemeral reminders.
- **`PostInvocation`**: Runs after the model's tool calls finish. Can force the agent to continue if tests fail.
- **`Stop`**: Runs when the agent tries to stop. Can BLOCK the stop and force continuation.

The hook command receives full context as JSON on **stdin** (conversation ID, workspace paths, tool call name and args, step index) and outputs a decision JSON on **stdout**.

### How We Leverage It

```json
// sentinel_2026/.agents/hooks.json
{
  "sentinel-invariant-gate": {
    "PostToolUse": [
      {
        "matcher": "write_to_file|replace_file_content",
        "hooks": [
          {
            "type": "command",
            "command": "python .engine/invariants.py",
            "timeout": 15
          }
        ]
      }
    ]
  },
  "sentinel-constraint-reminder": {
    "PreInvocation": [
      {
        "type": "command",
        "command": "python .engine/pre_invoke_reminder.py"
      }
    ]
  },
  "sentinel-stop-guard": {
    "Stop": [
      {
        "type": "command",
        "command": "python .engine/stop_guard.py"
      }
    ]
  }
}
```

#### Hook 1: `PostToolUse` → Invariant Gate
Every time the AI writes or edits ANY file (`write_to_file` or `replace_file_content`), the hook automatically runs `.engine/invariants.py`. This script:
1. AST-scans all Python files for banned patterns (UDP transport, `CAP_PROP_FPS`, hardcoded URLs, missing backoff).
2. Validates that all JSON payloads emitted by the code match the contract schemas in `contracts/`.
3. If violations are found, outputs `{}` but writes a detailed violation report that the agent sees in the next turn, forcing it to fix the issue immediately.

#### Hook 2: `PreInvocation` → Constraint Reminder
Before every model turn, `.engine/pre_invoke_reminder.py` reads `.engine/state.json` (current sprint, active pillar, pending tests) and injects an ephemeral message:

```json
{
  "injectSteps": [
    {
      "ephemeralMessage": "ACTIVE SPRINT: backend/stream_manager. PENDING: test_reconnect_backoff NOT YET PASSED. DO NOT move to next task until this test passes."
    }
  ]
}
```

This means **even if the AI's context is at 40k tokens and the original task description is truncated, the ephemeral injection re-anchors it** to the exact current objective every single turn.

#### Hook 3: `Stop` → Stop Guard
When the AI tries to stop (says "I'm done!"), `.engine/stop_guard.py` checks:
1. Are there failing tests in `.engine/state.json`?
2. Is the current sprint task marked as `PASSED`?
3. If not → outputs `{"decision": "continue", "reason": "Sprint task test_vision_tracker has not passed yet. Run the test and fix failures before stopping."}`.

The agent is **physically prevented from declaring victory until the gatekeeper confirms all tests pass.**

### What Failure Mode This Kills
**Silent Regressions → DEAD.** Every file write is automatically validated against invariants. The agent cannot write violating code and walk away.
**Circular Debug Traps → DEAD.** The PreInvocation reminder keeps the agent laser-focused on the one failing test, preventing it from wandering into unrelated fixes.
**Premature Completion → DEAD.** The Stop guard blocks the agent from stopping until verified.

---

## LAYER 3: CUSTOM SKILLS — Domain-Expert Runbooks

### What It Is (Antigravity Native)
Skills are `skills/<name>/SKILL.md` directories containing step-by-step procedures with scripts, examples, and references. Skills use **progressive disclosure** — only the name and description are loaded initially. The full SKILL.md is only loaded when the agent (or user) activates it, keeping token context minimal.

### How We Leverage It

```
sentinel_2026/.agents/skills/
├── sentinel-rtsp-ingestion/
│   └── SKILL.md          ← Step-by-step: how to connect to /api/ingest, handle TCP RTSP, backoff
├── sentinel-anpr-pipeline/
│   └── SKILL.md          ← Step-by-step: YOLO plate detect → OCR → normalize GJ plate format → DB lookup
├── sentinel-pts-tracker/
│   └── SKILL.md          ← Step-by-step: Kalman filter init, PTS-only update, discontinuity reset
├── sentinel-gis-registry/
│   └── SKILL.md          ← Step-by-step: Model 1 PostGIS camera registry, health status, gap analysis
└── sentinel-evaluation-csv/
    └── SKILL.md          ← Exact CSV schema required by jury, column headers, timestamp format
```

Each SKILL.md contains:
1. **Exact code patterns** (not pseudocode — actual copy-pasteable Python/TypeScript).
2. **Anti-patterns** (what NOT to do, with explanations of why it fails on the sandbox).
3. **Validation steps** (the exact `pytest` or `python test_*.py` command to verify the step worked).
4. **References** subdirectory linking to the relevant sections of `sentinel_command_file.md` and `problems_structured.md`.

### What Failure Mode This Kills
**Hallucinated Implementations → DEAD.** Instead of the AI inventing its own RTSP connection logic from general training data (which would use UDP or skip backoff), it reads the skill's exact tested code pattern. The skill IS the source of truth.

---

## LAYER 4: PLUGINS — The Complete Sentinel Dev Kit Bundle

### What It Is (Antigravity Native)
A plugin is a namespaced bundle that packages Skills + Rules + Hooks + MCP configs into a single deployable unit. When placed in `.agents/plugins/<name>/` with a `plugin.json`, ALL its sub-customizations are auto-loaded together.

### How We Leverage It

Instead of scattering rules, hooks, and skills across separate directories, we package our entire engineering engine as **one Sentinel plugin**:

```
sentinel_2026/.agents/plugins/sentinel-engine/
├── plugin.json           ← {"name": "sentinel-engine"}
├── hooks.json            ← All 3 lifecycle hooks (invariant gate, reminder, stop guard)
├── rules/
│   └── AGENTS.md         ← All invariant rules (TCP-only, PTS-only, no hardcoded URLs, etc.)
└── skills/
    ├── sentinel-rtsp-ingestion/SKILL.md
    ├── sentinel-anpr-pipeline/SKILL.md
    ├── sentinel-pts-tracker/SKILL.md
    ├── sentinel-gis-registry/SKILL.md
    └── sentinel-evaluation-csv/SKILL.md
```

**Why this matters**: When any agent — main orchestrator, subagent, or a fresh conversation — opens this workspace, the entire Sentinel engineering engine (rules + hooks + skills) loads automatically as a single unit. You don't have to remember to "tell the AI about the rules." The plugin IS the rules.

### What Failure Mode This Kills
**Setup Amnesia Across New Conversations → DEAD.** When you flush context and open a new chat (to get a fresh 0-token window), the plugin auto-loads. The new AI session has the full engineering harness from turn 1 without you pasting anything.

---

## LAYER 5: SUBAGENTS — Isolated Specialist Workers

### What It Is (Antigravity Native)
`define_subagent` creates a reusable subagent type with:
- A **custom system prompt** (narrowly scoped to one job).
- **Tool access control** (`enable_write_tools`, `enable_subagent_tools`, `enable_mcp_tools`).
- An isolated conversation context (0 token pollution from the parent).

`invoke_subagent` spawns instances with:
- **Workspace modes**: `inherit` (same directory), `branch` (Git worktree clone — isolated sandbox), `share` (shared repo, independent branch).
- **Model selection**: `inherit`, `flash` (fast simple tasks), `pro` (deep reasoning).
- Multiple subagents can run **concurrently**.

Communication happens through `send_message` (direct messaging) and Antigravity's **Reactive Wakeup Bus** (the parent automatically wakes up when a subagent finishes — NO polling loops needed).

### How We Leverage It

We define 4 specialist subagent types, each with a surgical system prompt that includes ONLY its pillar scope:

| Subagent Type | System Prompt Scope | Workspace Mode | Write Boundary |
| :--- | :--- | :--- | :--- |
| `sentinel_backend_engineer` | FastAPI, RTSP ingestion, SQLite watchlist, WebSocket relay | `inherit` | `backend/` only |
| `sentinel_vision_engineer` | YOLOv8, OCR, PTS Kalman tracker, CSV exporter | `inherit` | `vision/` only |
| `sentinel_frontend_engineer` | React/Vite, Leaflet GIS, alert cards, video wall | `inherit` | `frontend/` only |
| `sentinel_systems_architect` | HLD document, 80k-camera math, slide deck | `inherit` | `docs/` only |

Each subagent's system prompt includes:
1. The `contracts/` schema paths (so it knows the exact JSON interface).
2. A directive to read its pillar-specific `GEMINI.md` before starting.
3. The test command it must run before declaring completion.

**The parent orchestrator (this chat) NEVER writes project code.** It:
1. Plans sprints and writes task briefs.
2. Spawns subagents with precise, scoped instructions.
3. Receives completion messages via the reactive wakeup bus.
4. Validates output by running the integration test.
5. Updates `.engine/state.json` and moves to the next sprint.

### What Failure Mode This Kills
**Context Pollution → DEAD.** The vision subagent's 10,000 tokens of YOLO debugging never touch the frontend subagent's context. Each specialist operates at maximum intelligence within its domain.
**File Collision → DEAD.** Directory boundary rules in each pillar's `GEMINI.md` prevent any subagent from touching files outside its scope.

---

## LAYER 6: PLANNING MODE — The Sprint State Machine

### What It Is (Antigravity Native)
Planning Mode uses 3 special artifacts:
- `implementation_plan.md` — The approved architecture (already created).
- `task.md` — A living TODO checklist (`[ ]`, `[/]`, `[x]`).
- `walkthrough.md` — Post-completion summary with what was done and tested.

These artifacts persist on disk and can be `@`-mentioned in any conversation for instant context injection.

### How We Leverage It

The orchestrator maintains `task.md` as the **single source of sprint truth**:

```markdown
## Sprint 1: Backend Core
- [x] FastAPI scaffold with health endpoint
- [x] Mock VAHAN/eGujCop SQLite database with 25 test records
- [x] Camera registry REST API matching camera_registry.json contract
- [/] RTSP stream proxy with TCP enforcement and exponential backoff
- [ ] WebSocket alert broadcast channel

## Sprint 2: Vision Engine
- [ ] YOLOv8 plate detector with Indian HSRP support
- [ ] EasyOCR/PaddleOCR with GJ plate regex normalizer
- [ ] PTS-only Kalman tracker with discontinuity handler
- [ ] Evaluation CSV exporter matching jury format
```

Before spawning each subagent, the orchestrator:
1. Reads `task.md` to identify the next `[ ]` task.
2. Marks it `[/]` (in progress).
3. Spawns the appropriate specialist subagent with a precise instruction.
4. When the subagent reports completion AND the hook's invariant gate passes, marks `[x]`.

### What Failure Mode This Kills
**Lost Progress Tracking → DEAD.** `task.md` is the immutable progress record. Even if context flushes, the orchestrator reads it and knows exactly where we are.

---

## LAYER 7: `@` MENTIONS + NEW CONVERSATION — The Context Flush Protocol

### What It Is (Antigravity Native)
- **`@` Mentions**: In the chat canvas, typing `@` lets you attach files, folders, previous conversations, terminal sessions, and rules directly into the current message. Antigravity injects the referenced content into the model's context.
- **New Conversation**: Opens a fresh chat session with 0 tokens consumed. Maximum model intelligence.

### How We Leverage It

When a sprint gets heavy (20k+ tokens), instead of letting the AI degrade:

1. The orchestrator writes completion status to `task.md` and `walkthrough.md`.
2. You click **"+ New Conversation"** in the left sidebar.
3. In the fresh chat, you type:

   > Resume work. @task.md @implementation_plan.md @contracts/ Begin next uncompleted sprint.

4. The new AI session starts with:
   - 0 tokens of baggage.
   - The full engineering harness auto-loaded via the plugin.
   - The exact current state via `@task.md`.
   - The full architecture via `@implementation_plan.md`.
   - All contracts via `@contracts/`.

**This is our "infinite context" hack.** We never actually need infinite context. We need **precise context** at 0 tokens.

### What Failure Mode This Kills
**Token Rot / Degrading Intelligence → DEAD.** We can flush and restart with full state preservation at any moment. The AI is always operating at peak intelligence.

---

## LAYER 8: BACKGROUND TASKS + REACTIVE WAKEUP — Zero-Polling Automation

### What It Is (Antigravity Native)
- `run_command` with `IsDaemon: true` launches persistent background processes.
- `schedule` sets timers and cron jobs.
- The **Reactive Wakeup Bus** automatically resumes the orchestrator when a background task completes or a subagent sends a message. No polling loops needed.

### How We Leverage It

1. **Backend Dev Server**: Launched as a daemon (`uvicorn app.main:app --port 8000`). Stays running while subagents test against it.
2. **Frontend Dev Server**: Launched as a daemon (`npm run dev`). The UI is always accessible during integration testing.
3. **Integration Test Runner**: After each subagent completes, the orchestrator runs `python .engine/test_integration.py` as a background task. When it finishes, the reactive wakeup automatically notifies the orchestrator with the results — no manual checking.

### What Failure Mode This Kills
**Idle Waiting / Lost Test Results → DEAD.** The orchestrator never sits idle polling "is it done yet?" The bus tells it when things complete.

---

## LAYER 9: THE PYTHON SDK — Programmatic Agent Spawning

### What It Is (Antigravity Native)
`pip install google-antigravity` gives you:
```python
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig
async with Agent(config) as agent:
    response = await agent.chat("Build the RTSP stream manager")
    async for token in response: ...
```

### How We Leverage It (Optional Power Move)

If we want to go nuclear on automation, we write a Python orchestration script (`.engine/orchestrator.py`) that:
1. Reads `task.md` programmatically.
2. Finds the next `[ ]` task.
3. Spawns an Agent with the appropriate system prompt and workspace.
4. Streams its output to a log file.
5. Runs the invariant test.
6. Updates `task.md`.
7. Moves to the next task.

This is the **fully autonomous mode** — the entire project builds itself while you sleep, governed by the plugin's rules and hooks.

### What Failure Mode This Kills
**Human Bottleneck → DEAD.** The build pipeline runs autonomously. You review results in the morning.

---

## LAYER 10: `/teamwork-preview` — The Nuclear Launch Button

### What It Is (Antigravity Native)
The `/teamwork-preview` slash command is the highest-level orchestration primitive. When you type it in the chat, Antigravity:
1. Analyzes the project structure and your request.
2. Automatically decomposes it into a DAG of parallel and sequential tasks.
3. Spawns a team of autonomous subagents to execute the tasks.
4. Monitors progress, handles failures, and merges results.

### How We Leverage It

After the engine is installed (plugin + hooks + rules + contracts + skills), you type:

> `/teamwork-preview` Build the complete Sentinel 2026 Gujarat Police CCTV surveillance platform. The workspace has a plugin at `.agents/plugins/sentinel-engine/` with all rules, hooks, skills, and contracts pre-installed. Execute sprints from `task.md`. Each pillar (backend, vision, frontend, docs) is a separate workstream with directory boundaries enforced by per-directory GEMINI.md rules.

Antigravity's teamwork engine takes over:
- It reads the plugin, rules, hooks, and task list.
- It spawns the 4 pillar workers with the correct scope.
- The hooks automatically gate every file write.
- The stop guard prevents premature completion.
- You monitor progress in the **Auxiliary Pane → Subagents Monitor**.

**This is where everything converges.** The plugin ensures the teamwork agents can't violate constraints. The hooks ensure they can't write broken code. The rules ensure they can't touch each other's files. The skills ensure they use tested patterns instead of hallucinating. And `/teamwork-preview` orchestrates the entire thing autonomously.

---

## THE COMPLETE STACK (Bottom to Top)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  /teamwork-preview  OR  Manual Orchestrator Chat                       │  ← YOU INTERACT HERE
├─────────────────────────────────────────────────────────────────────────┤
│  Planning Mode: task.md ←→ implementation_plan.md ←→ walkthrough.md    │  ← Sprint state machine
├─────────────────────────────────────────────────────────────────────────┤
│  Subagents: backend_eng | vision_eng | frontend_eng | systems_arch     │  ← Isolated specialist workers
├─────────────────────────────────────────────────────────────────────────┤
│  Reactive Wakeup Bus + Background Daemons (dev servers, test runners)  │  ← Zero-polling automation
├─────────────────────────────────────────────────────────────────────────┤
│  @ Mentions + New Conversation = Context Flush With Zero State Loss     │  ← Infinite context hack
├─────────────────────────────────────────────────────────────────────────┤
│  Plugin: sentinel-engine (bundles everything below as one unit)         │  ← Auto-loads on workspace open
├──────────────┬──────────────────┬───────────────────┬───────────────────┤
│  Skills      │  Hooks           │  Rules            │  Contracts        │
│  5 runbooks  │  PostToolUse:    │  Root GEMINI.md   │  camera_registry  │
│  with tested │   invariant gate │  + 4 pillar-local │  alert_event      │
│  code        │  PreInvocation:  │   boundary rules  │  evaluation_csv   │
│  patterns    │   state reminder │                   │                   │
│              │  Stop: guard     │                   │                   │
└──────────────┴──────────────────┴───────────────────┴───────────────────┘
```

---

## IMMEDIATE NEXT STEP

> [!IMPORTANT]
> **Decision Required**: Do you want me to:
>
> **Option A**: Build the full engine right now (create the plugin directory structure, write all GEMINI.md rules, hooks.json, skills, contracts, invariants.py, and state machine), then let you trigger `/teamwork-preview` to build the project autonomously?
>
> **Option B**: Build the engine AND immediately start spawning subagents from this chat to begin coding the 4 pillars in parallel?
>
> **Option C**: Build the engine first, then you open a fresh `/teamwork-preview` conversation against the workspace (maximum fresh context + full engine auto-loaded)?
