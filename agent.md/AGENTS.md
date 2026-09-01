# The PickleHub — Agent Operating Manual

This file defines how the AI coding agent must work on this repository. Read this file **first**, in every session, before touching any code.

You are **one agent operating in three sequential modes** — Builder, Reviewer, Memory Manager — for every milestone. Do not skip a mode, do not merge modes, and do not advance to the next milestone until all three have run for the current one.

---

## 0. Required Reading Order (every session)

1. `MEMORY.md` → `## Current State` — tells you the last completed milestone and exactly where to resume. This overrides any assumption you make from reading code or `MILESTONES.md` alone.
2. `MILESTONES.md` → find the milestone named in `## Current State` as "next" or "in progress" — this is your task list and acceptance checklist for the session.
3. `prd-v2.md` — consult for any spec detail (schemas, formulas, API contracts, rules) the milestone references. This is the fixed source of truth for *what* to build; `MILESTONES.md` is the source of truth for *what order* and *what "done" means*.
4. The actual repo — verify it matches what `MEMORY.md` claims. If it doesn't (a previous session forgot to log, or logged inaccurately), fix `MEMORY.md` before proceeding and note the correction in `## Known Issues / Deviations`.

Never start writing code before completing this reading order.

---

## 1. Mode 1 — BUILDER

**Goal:** Implement the current milestone's tasks from `MILESTONES.md`.

Rules while in Builder mode:
- Follow the PRD's AI Agent Development Rules (Section 15, Rules A–M) at all times:
  - Understand existing code before changing it; don't rewrite unnecessarily.
  - Don't break working functionality.
  - No fake/non-functional UI, no mock data in production flows.
  - All Elo/rating logic lives only in the backend rating service — never duplicated in the frontend.
  - Validate every input.
  - Never silently alter ratings or match results — every change needs an audit trail where the PRD requires one.
  - No secrets in source code.
  - Mobile-first on every screen.
  - Reuse components; don't duplicate UI logic.
  - Use meaningful, descriptive naming.
  - Any change to rating logic must ship with tests.
  - **Standing CI Guardrail Requirement:** Every milestone must pass `npm run ci:guardrails` (`node scripts/ci-guardrails.js`), ensuring zero mock data patterns in production files and zero unwired/dead interactive buttons or links across all UI views.
- Work only on the current milestone's scope. If you discover unrelated bugs or improvements, note them in `## Known Issues / Deviations` in `MEMORY.md` rather than fixing them mid-milestone, unless they block the current task.
- Do not mark anything as done yet. Builder mode ends when you believe the tasks are implemented — verification is a separate mode, not your own call to make.

**Exit condition:** All tasks listed for the milestone in `MILESTONES.md` appear implemented. Proceed to Reviewer mode.

---

## 2. Mode 2 — REVIEWER

**Goal:** Verify what Builder mode actually produced, adversarially — as if you did not write it.

Switch mindset explicitly. Do not assume the build is correct because you just wrote it.

Rules while in Reviewer mode:
- Go through the milestone's **Acceptance Checklist** in `MILESTONES.md` item by item. For each item, verify — don't assume:
  - Run the tests that exist. If a checklist item requires a test that doesn't exist yet, that item is not satisfied — go back to Builder mode and write it.
  - For DB/transaction-related items (e.g. atomic approval, race-condition guards), trace the actual code path, don't take the diff's word for it.
  - For "no secrets committed" / "no mock data" / "no fake buttons" — actually grep for it, don't assume.
- Cross-check against the cross-cutting Rules A–M again, independently of Builder mode's self-assessment.
- Cross-check against `## Known Issues / Deviations` in `MEMORY.md` — did this milestone introduce any new deviation from the PRD? If so, it must be documented, not silently shipped.
- If **any** checklist item fails: state exactly what failed and why, go back to **Builder mode** to fix it, then return to Reviewer mode and re-check from the top of the checklist. Do not partially pass a milestone.
- If everything passes: explicitly state "All acceptance criteria met" and list the checklist with each item marked, before proceeding.

**Exit condition:** Every item in the milestone's Acceptance Checklist is verifiably satisfied. Proceed to Memory Manager mode.

**Hard rule:** Never proceed to Memory Manager mode on a partial pass. A milestone is either fully done or still in Builder mode — there is no shortcut.

---

## 3. Mode 3 — MEMORY MANAGER

**Goal:** Record what actually happened, so any future agent session (yours or another's) can resume with zero missing context.

Only enter this mode after Reviewer mode has confirmed a full pass. If Reviewer mode found issues and you fixed them, Memory Manager mode reflects the *final*, passing state — not the intermediate failures.

Tasks:
1. Append a new entry to `## Milestone Log` in `MEMORY.md`, using the template already in that file. Fill in every section honestly:
   - What was built (concrete, specific)
   - Files touched
   - Key decisions made and why (anything not dictated explicitly by the PRD)
   - Deviations from the PRD, if any
   - Tests run and their results
   - Full acceptance checklist with every item marked
   - Resume point for the next agent — one or two concrete sentences
2. Overwrite `## Current State` at the top of `MEMORY.md`:
   - Last completed milestone → this one
   - In progress → clear it, or note the next milestone as "not started"
   - Next milestone to start → the next one in `MILESTONES.md`
   - Repo/environment state → current reality
   - Last updated → today's date
3. Update `## Known Issues / Deviations` — remove resolved items (and note the resolution in the log entry instead), add any new ones.
4. Commit `MEMORY.md` together with the milestone's code in the same commit/PR. The log entry and the code it describes must never drift apart.

**Absolute rule:** Never log a milestone as complete if Reviewer mode did not confirm a full pass. Never write an aspirational entry — only what was actually built and verified.

**Exit condition:** `MEMORY.md` accurately reflects the new state. Session may end here, or loop back to Mode 1 for the next milestone if continuing.

---

## 4. Mid-Milestone Interruptions

If the session is paused, runs out of context, or is stopped before Reviewer mode passes:
- Do not skip to Memory Manager mode and fabricate a "completed" entry.
- Instead, update only `## Current State` in `MEMORY.md` with an honest "in progress" note: what's built, what's not, which mode you were in, and the exact next step. This is a breadcrumb, not a milestone log entry — it does not go in `## Milestone Log`.

---

## 5. Summary — The Loop

```
Read MEMORY.md → identify current milestone
        │
        ▼
   [ BUILDER ]  implement tasks from MILESTONES.md, per PRD + Rules A–M
        │
        ▼
  [ REVIEWER ]  verify acceptance checklist item-by-item, adversarially
        │
     fail │ pass
        │   │
        ▼   ▼
   back to     [ MEMORY MANAGER ]  log entry + update Current State
   BUILDER            │
                       ▼
              next milestone → back to BUILDER
```

One agent. Three modes. No milestone is done until all three have run.
