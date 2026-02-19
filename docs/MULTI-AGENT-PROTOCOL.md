# MULTI-AGENT PROTOCOL — GERVIFRAIS Fleet Management App
> IMMUTABLE — Created by AGENT-ARCHITECTURE | Do not modify

---

## 1. Overview

The GERVIFRAIS fleet management application is built using a **6-agent collaboration model**.
Each agent is a specialized AI instance with a focused scope of responsibility.
Agents communicate exclusively through shared files — never directly.

**Why multi-agent?**
A single agent handling the full codebase would suffer context explosion (lost history,
hallucinated file contents, inconsistent decisions). By splitting into specialized agents,
each agent maintains a small, focused context and produces high-quality output in its domain.

---

## 2. The 6 Agents

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGENT REGISTRY                                   │
├──────────────────────┬────────────────────────────────────────────────┤
│ Agent                │ Responsibility                                   │
├──────────────────────┼────────────────────────────────────────────────┤
│ AGENT-ARCHITECTURE   │ Monorepo structure, config, documentation       │
│ AGENT-DATABASE       │ PostgreSQL schema, migrations, seed data        │
│ AGENT-ALGO           │ Route optimization engine (TSP + 2-OPT)         │
│ AGENT-BACKEND-API    │ Express API, controllers, services, WebSocket   │
│ AGENT-FRONTEND       │ React manager dashboard (Mapbox, KPI, WebSocket)│
│ AGENT-DRIVER         │ React Native driver app (screens, camera, GPS)  │
└──────────────────────┴────────────────────────────────────────────────┘
```

### Agent Scopes (strict — do NOT cross boundaries)

| Agent | Creates/Owns | Never touches |
|-------|-------------|---------------|
| AGENT-ARCHITECTURE | `/docs/`, root configs, folder structure | Business logic, UI code |
| AGENT-DATABASE | `backend/src/db/`, migrations, seed data | API controllers, UI |
| AGENT-ALGO | `backend/src/services/routeOptimization.ts` | Database, UI, other services |
| AGENT-BACKEND-API | `backend/src/api/`, `backend/src/services/` (except algo) | Frontend, mobile |
| AGENT-FRONTEND | `frontend-manager/src/` | Backend, mobile app |
| AGENT-DRIVER | `app-driver/src/` | Backend, web dashboard |

---

## 3. Shared Files (IMMUTABLE)

These files are created once and **never modified** after creation.
They serve as the single source of truth for all agents.

```
/docs/ARCHITECTURE.md        ← Created by: AGENT-ARCHITECTURE
/docs/DATABASE_SCHEMA.md     ← Created by: AGENT-DATABASE
/docs/ALGORITHM_SPEC.md      ← Created by: AGENT-ALGO
/docs/API_CONTRACT.md        ← Created by: AGENT-BACKEND-API
/docs/MANAGER_UI.md          ← Created by: AGENT-FRONTEND
/docs/DRIVER_APP.md          ← Created by: AGENT-DRIVER
/shared/types.ts             ← Created by: AGENT-DATABASE (from schema)
```

### Immutability Rules
1. Once an IMMUTABLE file is created and committed, **no agent may edit it**.
2. If a change is needed (rare), it must be flagged as a **PROTOCOL CHANGE REQUEST**
   in the relevant agent context file, and the originating agent must create a new version.
3. All agents **must read** the relevant shared files before starting work.

---

## 4. Agent Context Files (Mutable)

Each agent maintains its own context file to track progress, blockers, and decisions.
These files ARE mutable and updated throughout development.

```
/docs/AGENT-ARCHITECTURE-CONTEXT.md
/docs/AGENT-DATABASE-CONTEXT.md
/docs/AGENT-ALGO-CONTEXT.md
/docs/AGENT-BACKEND-CONTEXT.md
/docs/AGENT-FRONTEND-CONTEXT.md
/docs/AGENT-DRIVER-CONTEXT.md
```

### Context File Schema

Each context file must contain:

```markdown
# AGENT-{NAME} CONTEXT

## Status
Current state: [Not Started | In Progress | Blocked | Complete]

## Completed Tasks
- [x] Task description (date)

## In Progress
- [ ] Current task description

## Pending Tasks
- [ ] Future task

## Files Touched
- path/to/file.ts — description of change

## Blockers
- (None) or description of blocker + which agent can unblock

## Decisions Made
- Decision description + rationale

## Messages for Other Agents
- → AGENT-DATABASE: (message if relevant)
```

---

## 5. Execution Order

Agents must be invoked in dependency order. A downstream agent cannot start until
its upstream dependencies have committed their shared files.

```
Phase 1: Foundation
  AGENT-ARCHITECTURE (this agent)
    └── Outputs: /docs/ARCHITECTURE.md, folder structure, config files
          ↓
  AGENT-DATABASE
    └── Reads: ARCHITECTURE.md
    └── Outputs: DATABASE_SCHEMA.md, schema.sql, models.ts, shared/types.ts
          ↓
Phase 2: Core Logic (can run in parallel after Phase 1)
  AGENT-ALGO
    └── Reads: ARCHITECTURE.md, DATABASE_SCHEMA.md, shared/types.ts
    └── Outputs: ALGORITHM_SPEC.md, routeOptimization.ts

  AGENT-BACKEND-API
    └── Reads: ARCHITECTURE.md, DATABASE_SCHEMA.md, shared/types.ts
    └── Waits for: AGENT-ALGO (for routeOptimization service import)
    └── Outputs: API_CONTRACT.md, all backend API code
          ↓
Phase 3: Frontend (after API_CONTRACT.md exists)
  AGENT-FRONTEND  (parallel with AGENT-DRIVER)
    └── Reads: ARCHITECTURE.md, API_CONTRACT.md, shared/types.ts
    └── Outputs: MANAGER_UI.md, frontend-manager/ code

  AGENT-DRIVER    (parallel with AGENT-FRONTEND)
    └── Reads: ARCHITECTURE.md, API_CONTRACT.md, shared/types.ts
    └── Outputs: DRIVER_APP.md, app-driver/ code
```

---

## 6. Communication Rules

### Rule 1: Read Before You Write
Before any agent starts coding, it must read:
- `/docs/ARCHITECTURE.md` (always)
- All shared docs relevant to its domain
- Its own context file (to resume from where it left off)

### Rule 2: Announce Completions
When an agent completes a shared file, it updates its context file with:
```
## Messages for Other Agents
- → ALL: /docs/DATABASE_SCHEMA.md is ready. shared/types.ts is committed.
         AGENT-ALGO and AGENT-BACKEND-API can now proceed.
```

### Rule 3: Declare Blockers Immediately
If an agent is blocked (e.g., waiting for a shared file), it:
1. Updates its context file with the blocker
2. Lists which agent can unblock it
3. Does NOT guess or hallucinate missing information

### Rule 4: Never Modify Another Agent's Files
- Each agent only modifies files in its own domain
- Exception: shared/types.ts belongs to AGENT-DATABASE; others only read it

### Rule 5: One Commit Per Logical Unit
```
Format: [AGENT-NAME] description of change
Examples:
  [ARCH] create monorepo structure and config files
  [DB] add PostgreSQL schema with 11 tables
  [ALGO] implement nearest neighbor TSP algorithm
  [API] add route optimization endpoint
  [FE] add Mapbox real-time driver markers
  [DRIVER] implement photo capture screen
```

---

## 7. File Consultation Map

Which agent reads which shared files:

```
                 ARCH  DB   ALGO  API   FE    DRIVER
ARCHITECTURE.md   W    R    R     R     R     R
DATABASE_SCHEMA   -    W    R     R     R     R
ALGORITHM_SPEC    -    -    W     R     -     -
API_CONTRACT      -    -    -     W     R     R
MANAGER_UI        -    -    -     -     W     -
DRIVER_APP        -    -    -     -     -     W
shared/types.ts   -    W    R     R     R     R

W = writes (creates), R = reads only
```

---

## 8. Conflict Resolution

### Type Conflicts (shared/types.ts)
If AGENT-BACKEND-API or another agent discovers a type mismatch:
1. Document the conflict in its context file
2. Notify AGENT-DATABASE (the owner of types.ts)
3. AGENT-DATABASE issues a new version of types.ts with a version bump

### API Contract Conflicts
If the frontend or driver app needs an endpoint not in API_CONTRACT.md:
1. Document in context file under "Messages for Other Agents"
2. AGENT-BACKEND-API adds the endpoint and updates API_CONTRACT.md
3. Downstream agents reread the contract

### Schema Conflicts
If AGENT-BACKEND-API finds a missing column/table:
1. Document in context file
2. AGENT-DATABASE creates a new migration file (never modifies schema.sql)
3. Updates DATABASE_SCHEMA.md with the addition

---

## 9. Escalation Process

If an agent cannot proceed due to an ambiguous requirement:

```
Step 1: Check all shared docs (ARCHITECTURE.md, DATABASE_SCHEMA.md, etc.)
Step 2: Check relevant agent context files for hints
Step 3: If still blocked, document in own context file:
          "BLOCKED: [description]. Needs clarification from human operator."
Step 4: Halt and surface the question to the human
Step 5: Human clarifies → agent updates context file and resumes
```

**Do NOT** make assumptions on ambiguous requirements that could affect other agents.
Assumptions on local implementation details (naming, formatting) are acceptable.

---

## 10. Agent Handoff Checklist

Before an agent declares itself "complete", it must verify:

```
□ All assigned files are created and committed
□ Shared doc (if responsible) is written and marked IMMUTABLE
□ Context file is updated with:
  □ Status = Complete
  □ All tasks checked off
  □ Files touched list is complete
  □ Messages for downstream agents are written
□ Code compiles without errors (TypeScript strict)
□ No hardcoded secrets (all via env variables)
□ Git commit follows naming convention
□ Context file includes "Ready for: AGENT-[NEXT]"
```

---

## 11. Bootstrap Sequence (First Run)

```
1. Human invokes AGENT-ARCHITECTURE
   → Creates: docs/, folder structure, this file, ARCHITECTURE.md
   → Commits: [ARCH] create monorepo structure and config files

2. Human invokes AGENT-DATABASE
   → Reads: ARCHITECTURE.md
   → Creates: schema.sql, models.ts, DATABASE_SCHEMA.md, shared/types.ts
   → Commits: [DB] add PostgreSQL schema with 11 tables and seed data

3. Human invokes AGENT-ALGO (can parallel with step 4)
   → Reads: ARCHITECTURE.md, DATABASE_SCHEMA.md, shared/types.ts
   → Creates: routeOptimization.ts, ALGORITHM_SPEC.md
   → Commits: [ALGO] implement TSP nearest neighbor with 2-OPT

4. Human invokes AGENT-BACKEND-API
   → Reads: ARCHITECTURE.md, DATABASE_SCHEMA.md, ALGORITHM_SPEC.md, shared/types.ts
   → Creates: all backend API code, API_CONTRACT.md
   → Commits: multiple commits per feature

5. Human invokes AGENT-FRONTEND
   → Reads: ARCHITECTURE.md, API_CONTRACT.md, shared/types.ts
   → Creates: frontend-manager/ code, MANAGER_UI.md
   → Commits: multiple commits per component

6. Human invokes AGENT-DRIVER
   → Reads: ARCHITECTURE.md, API_CONTRACT.md, shared/types.ts
   → Creates: app-driver/ code, DRIVER_APP.md
   → Commits: multiple commits per screen
```

---

*Version: 1.0.0 | Created: 2026-02-19 | Agent: AGENT-ARCHITECTURE*
