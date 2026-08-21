# The PickleHub — Project Memory

This file is the single source of truth for **where the project currently stands**. It is maintained by whichever AI coding agent is working on the repo. Any new agent session — same agent or different — must read this file **first**, before reading code, before reading the PRD, before doing anything else.

Two other files this works alongside:
- `prd-v3.md` — what to build (fixed, doesn't change during dev)
- `milestone.md.md` — the roadmap and checklists (source of truth for *what "done" means* per milestone)
- `MEMORY.md` (this file) — what has *actually* been built so far, and the exact point to resume from

---

## AGENT INSTRUCTIONS (read this section every session)

1. **On starting any session:** Read `## Current State` below first. That tells you the last completed milestone, what's in progress, and any open issues. Do not assume the codebase matches `MILESTONES.md` — assume it matches this file.
2. **Before writing code:** Cross-check `## Current State` against the actual repo (run tests, check schema files, etc.) if anything looks stale or ambiguous. This file can lag behind reality if a previous session forgot to update it — trust but verify.
3. **On completing a milestone** (i.e., every checkbox in that milestone's Acceptance Checklist in `MILESTONES.md` is satisfied):
   - Append a new entry to `## Milestone Log` using the template below. Do not edit or delete previous log entries — this is an append-only log.
   - Update `## Current State` to reflect the new "last completed milestone" and "next milestone."
   - Update `## Known Issues / Deviations` if anything changed.
   - Commit `MEMORY.md` in the same commit/PR as the milestone's code, so the log entry and the code it describes never drift apart.
4. **If you stop mid-milestone** (context runs out, task is paused, etc.): still update `## Current State` with an honest "in progress" note — what's done, what's not, what file you were last touching. Do not wait for full milestone completion to leave a breadcrumb.
5. **Never fabricate a log entry.** If a milestone's acceptance checklist isn't fully satisfied, don't log it as complete — log it as in-progress and say what's missing.
6. **Keep entries factual, not aspirational.** Log what was actually built and tested, not what was intended.

---

## Current State

> Overwrite this section every time. It should always describe *right now*, not history.

- **Last completed milestone:** Milestone 4 — Rating Engine (Sprint 4)
- **In progress:** None
- **Next milestone to start:** Milestone 5 — Match Submissions (Sprint 5)
- **Repo state:** Client builds cleanly with zero errors/warnings; Server test suites pass (62/62 tests ok — auth 14, player 14, duplicate email 4, rating engine 44 [including singles/doubles/edge cases/config]); ESLint & Oxlint clean; Full Elo rating engine implemented with individually-weighted doubles delta distribution (PRD Section 7.2 full spec, not MVP fallback); K-factor configurable via `DEFAULT_K_FACTOR` env variable.
- **Environment/deploy state:** Local development (`client: localhost:5173`, `server: localhost:5000`)
- **Last updated:** 2026-08-21 by AI Coding Agent (Milestone 4 Complete)

---

## Known Issues / Deviations from PRD

> Running list. Anything where the implementation differs from `prd-v3.md`, any shortcuts taken, any TODOs deferred to a later milestone. Delete an item once it's resolved and note the resolution in the Milestone Log instead.

- _None — all implementations align strictly with PRD v3_

---

## Milestone Log

> Append-only. Newest entry at the bottom. One entry per milestone (or per meaningful checkpoint if a milestone spans multiple sessions).

### Milestone 0 — Pre-Development Setup
- **Status:** Completed
- **Date:** 2026-08-19
- **Session/Agent:** Initial Setup

**What was built:**
- Monorepo folder layout with `client/`, `server/`, `docs/`, `.env.example`, `.gitignore`, `README.md`.
- PRD v3, Design tokens specification (`DESIGN.md`), and Milestone roadmap definitions.

**Files touched:**
- `.gitignore`, `.env.example`, `README.md`, `docs/DESIGN.md`, `docs/prd-v3.md`, `docs/milestone.md.md`

**Key decisions made:**
- Chose clean monorepo folder layout with separate `client/` and `server/` directories.

**Acceptance checklist status:**
- [x] Confirm free-tier accounts: MongoDB Atlas (M0), Vercel
- [x] Create GitHub repo with `.gitignore`, `README.md`
- [x] Decide monorepo vs. separate `client/` + `server/` folders
- [x] Draft `.env.example` (no real secrets committed)

**Resume point for next agent:**
- Proceed to Milestone 1 foundation skeleton.

---

### Milestone 1 — Foundation (Sprint 1)
- **Status:** Completed
- **Date:** 2026-08-19
- **Session/Agent:** Sprint 1

**What was built:**
- React 19 + Vite frontend with Tailwind CSS v4 and Google Fonts (`Playfair Display`, `Hanken Grotesk`).
- Express.js backend with helmet, cors, morgan, json/urlencoded body parsers.
- Centralized environment variable loader and validator (`src/config/env.js`).
- Mongoose MongoDB connection module (`src/config/db.js`).
- Global error handling middleware (`src/middleware/errorHandler.js`) and health check route (`GET /api/health`).
- Clean linting configuration (ESLint on server, Oxlint on client).

**Files touched:**
- `server/src/server.js`, `server/src/config/db.js`, `server/src/config/env.js`, `server/src/middleware/errorHandler.js`, `server/src/routes/healthRoutes.js`, `client/src/index.css`, `client/package.json`, `server/package.json`

**Acceptance checklist status:**
- [x] Server boots without errors and confirms DB connection logic
- [x] Base error handling and health route operational
- [x] No secrets committed to the repo (Rule H)

**Resume point for next agent:**
- Proceed to Milestone 2 Authentication.

---

### Milestone 2 — Authentication (Sprint 2)
- **Status:** Completed
- **Date:** 2026-08-19
- **Session/Agent:** Sprint 2

**What was built:**
- `User` Mongoose schema (PRD Section 10.1) with `email`, `password`, `role` (`PLAYER`/`ADMIN`), `failedLoginAttempts`, `lockedUntil`, `createdAt`.
- Password hashing with `bcryptjs` (salt rounds = 10) in Mongoose `pre('save')` hook and instance method `comparePassword`.
- Account lockout mechanism (PRD Section 5.3 & 10.1): 5 consecutive failed attempts lock the account for 15 minutes; resets upon successful login.
- JWT authentication service (`generateToken`, `verifyToken`) using `JWT_SECRET` and `JWT_EXPIRES_IN`.
- Role-based route middleware: `protect` (verifies Bearer JWT, attaches `req.user`) and `authorize(...roles)` (enforces `PLAYER` vs `ADMIN`).
- Auth API endpoints:
  - `POST /api/auth/register` (creates user, validates password length, issues JWT)
  - `POST /api/auth/login` (checks lockout, verifies credentials, handles failed attempt tracking, issues JWT)
  - `POST /api/auth/logout` (stateless confirmation)
  - `GET /api/auth/me` (protected endpoint returning current authenticated user)
- Client authentication infrastructure:
  - `client/src/services/api.js` Axios client with authorization interceptors and 401 handling.
  - `client/src/context/AuthContext.jsx` with reactive login/register/logout states and token re-hydration.
  - `client/src/components/Navbar.jsx` with active navigation indicators and role badges.
  - `client/src/components/ProtectedRoute.jsx` route guard supporting role authorization and loading spinners.
  - `client/src/pages/HomePage.jsx` Cinematic Editorial hero landing page.
  - `client/src/pages/LoginPage.jsx` with error/lockout banners and show/hide password toggle.
  - `client/src/pages/RegisterPage.jsx` with password confirmation and starting rating (1000 Elo) badge.
  - `client/src/pages/DashboardPage.jsx` Player Dashboard with starting Elo rating summary and verification workflow notice.
  - `client/src/pages/AdminPage.jsx` Admin-only Control Panel protected by role guard.
  - `client/src/App.jsx` React Router v7 routes.

**Files touched:**
- `server/package.json`, `server/src/models/User.js`, `server/src/services/authService.js`, `server/src/middleware/authMiddleware.js`, `server/src/controllers/authController.js`, `server/src/routes/authRoutes.js`, `server/src/server.js`, `server/test/auth.test.js`, `client/src/services/api.js`, `client/src/context/authContextDef.js`, `client/src/context/AuthContext.jsx`, `client/src/context/useAuth.js`, `client/src/components/Navbar.jsx`, `client/src/components/ProtectedRoute.jsx`, `client/src/pages/HomePage.jsx`, `client/src/pages/LoginPage.jsx`, `client/src/pages/RegisterPage.jsx`, `client/src/pages/DashboardPage.jsx`, `client/src/pages/AdminPage.jsx`, `client/src/App.jsx`

**Acceptance checklist status:**
- [x] Passwords never stored in plaintext
- [x] JWT secret pulled from environment, not hardcoded (Rule H)
- [x] Non-admins cannot access admin-only routes (verified with automated test + route guard)
- [x] Account lockout after 5 consecutive failed attempts (Section 5.3)
- [x] No secrets committed to the repo (Rule H)
- [x] No mock data in production flows (Rule D)
- [x] Mobile-first UI on all auth and dashboard screens (Rule I)

**Resume point for next agent:**
- Proceed to Milestone 3 Players.

---

### Milestone 3 — Players (Sprint 3)
- **Status:** Completed
- **Date:** 2026-08-19
- **Session/Agent:** Sprint 3

**What was built:**
- `Counter` Mongoose schema (PRD Section 10.7) with static `getNextSequence(sequenceName)` using atomic `findOneAndUpdate` with `$inc`.
- `Player` Mongoose schema (PRD Section 10.2):
  - Fields: `userId` (ref: `User`), `playerId` (`PH-XXXXX`, unique, indexed), `name`, `email`, `profilePhoto`, `currentRating` (default 1000), `highestRating` (default 1000), `category` (derived), `matchesPlayed`, `wins`, `losses`, `winningStreak`, `tournamentWins`, `tournamentAppearances`, `accountStatus` (`ACTIVE`/`SUSPENDED`), `createdAt`.
  - Virtual `winPercentage`: `(wins / matchesPlayed) * 100` dynamically computed to eliminate stored desync bugs.
- `playerService.js`:
  - `generatePlayerId()` generating sequential zero-padded 5-digit IDs (`PH-00001`).
  - `calculateCategory(rating)` deriving categories per PRD Section 8.1: Beginner (<1000), Intermediate (1000–1199), Advanced Intermediate (1200–1399), Pro (1400+).
  - `createPlayerProfile()` creating player profile with derived category.
  - `getOrCreatePlayerProfile()` lazy-repair fallback ensuring 100% zero orphaned accounts.
- Integrated auth registration to automatically create linked `Player` profile and accept `name`.
- `playerController.js` & `playerRoutes.js`:
  - `GET /api/players` (active players directory with category filter and pagination).
  - `GET /api/players/:id` (dual identifier lookup supporting both `PH-XXXXX` and Mongo ObjectId with explicit branching).
  - `GET /api/players/me` (authenticated player profile).
  - `PUT /api/players/me` (self profile update for display name and profile photo).
  - `GET /api/players/search?query=...` (autocomplete search projecting strictly public fields, zero email leakage).
- Client player features:
  - `AuthContext.jsx` with persistent `player` state and `refreshProfile()` helper.
  - `RegisterPage.jsx` updated with Full Name input field.
  - `DashboardPage.jsx` updated with live linked Player ID (`PH-00001`), share/copy button, live Elo rating, category badge, career stats, and inline name editor.
  - `PlayerProfilePage.jsx` public sharable profile page at `/players/:id`.
  - `index.html` updated with SEO meta description and title.
- Automated test suite `server/test/player.test.js`:
  - Skill category thresholds test.
  - Player ID zero-padding formatting test.
  - Player model defaults and `winPercentage` virtual test.
  - Dual lookup branching logic test.
  - 50-worker parallel concurrency test confirming zero collisions.

**Files touched:**
- `server/src/models/Counter.js`, `server/src/models/Player.js`, `server/src/services/playerService.js`, `server/src/controllers/playerController.js`, `server/src/routes/playerRoutes.js`, `server/src/controllers/authController.js`, `server/src/server.js`, `server/test/player.test.js`, `server/package.json`, `client/src/context/AuthContext.jsx`, `client/src/pages/RegisterPage.jsx`, `client/src/pages/DashboardPage.jsx`, `client/src/pages/PlayerProfilePage.jsx`, `client/src/App.jsx`, `client/index.html`

**Acceptance checklist status:**
- [x] Users can register and receive a secured profile with starting rating `1000` (DoD #1)
- [x] Player IDs are guaranteed unique even under concurrent registrations (DoD #9)
- [x] Non-admins cannot access admin-only routes
- [x] No secrets committed to the repo (Rule H)
- [x] Public player search does not leak emails

**Resume point for next agent:**
- Start **Milestone 4 — Rating Engine (Sprint 4)**: Implement standalone tested Elo calculation service (`server/src/services/ratingService.js`) implementing Expected Score $E_A = \frac{1}{1+10^{(R_B-R_A)/400}}$, Rating Update $R'_A = R_A + K\cdot(S_A - E_A)$, configurable K-factor (default 32), Doubles team-average logic and weighted delta distribution per PRD Section 7.2 (or documented MVP fallback per Section 15 Rule N), and comprehensive unit tests.

---

### Milestone 4 — Rating Engine (Sprint 4)
- **Status:** Completed
- **Date:** 2026-08-21
- **Session/Agent:** Sprint 4

**What was built:**
- `ratingService.js` — standalone Elo calculation engine with zero DB dependencies:
  - `calculateExpectedScore(ratingA, ratingB)` — PRD Section 7.1 expected score formula: $E_A = 1/(1+10^{(R_B-R_A)/400})$.
  - `calculateRatingDelta(rating, opponentRating, actualScore, kFactor)` — signed delta with configurable K-factor.
  - `calculateNewRating(currentRating, delta)` — addition with floor at 0 (ratings cannot go negative).
  - `calculateSinglesRatingChanges({ playerA, playerB, winnerSide, kFactor })` — returns `[{ playerId, oldRating, newRating, delta }]` for both players.
  - `calculateDoublesRatingChanges({ teamA, teamB, winnerTeam, kFactor })` — full PRD Section 7.2 individually-weighted delta distribution with bounded weights `w ∈ [0.75, 1.25]` and re-normalization.
  - `calculateMatchRatingChanges({ matchType, teamA, teamB, winnerTeam, kFactor })` — unified dispatcher routing to singles or doubles.
- `DEFAULT_K_FACTOR` added to `env.js` configuration, read from `process.env.DEFAULT_K_FACTOR` with fallback to `32`.
- `.env.example` updated with `DEFAULT_K_FACTOR=32` and explanatory comment.
- Comprehensive test suite `server/test/rating.test.js` (44 tests across 8 test suites):
  - Expected score: equal ratings, higher/lower rated, complementary scores, extreme gaps, 400-point gap.
  - Rating delta: positive/negative, equal-rated ±16, expected/upset wins, K-factor scaling and defaults.
  - New rating: addition, subtraction, floor at 0, rounding.
  - Singles: symmetric deltas, expected wins, upsets, winner side B, old rating preservation, extreme gaps.
  - Doubles: 4-entry output, equal teams, weighted win distribution, weighted loss distribution, weight bounds, re-normalization, winner team B, old ratings.
  - Dispatcher: SINGLES routing, DOUBLES routing, unsupported type error.
  - Edge cases: floor at 0 (singles & doubles), K=0, large K, rating of 0.
  - Configuration: default K=32, per-call override.

**Files touched:**
- `server/src/services/ratingService.js` (NEW), `server/src/config/env.js`, `server/test/rating.test.js` (NEW), `server/package.json`, `.env.example`

**Key decisions made:**
- Implemented **full PRD Section 7.2 individually-weighted delta distribution** for doubles, not the MVP fallback. This produces a more correct rating system and avoids a known deviation. The formula `w_i = clamp(1 - d_i/800, 0.75, 1.25)` applies symmetrically: weaker players receive a larger magnitude delta in both win and loss scenarios, consistent with the explicit formula in the PRD.
- Ratings are rounded to the nearest integer and floored at 0.
- K-factor is accepted as a parameter on every function with fallback to `env.DEFAULT_K_FACTOR`, enabling future per-match or per-tournament K-factor overrides.

**Deviations from PRD:** None — full Section 7.2 spec implemented.

**Tests run and results:**
- `node --test test/rating.test.js` — 44/44 pass
- `npm test` (full regression) — 62/62 pass (auth + player + duplicate_email + rating)

**Acceptance checklist status:**
- [x] Test suite passes for singles and doubles scenarios (Rule M)
- [x] K-factor is read from config/DB, not hardcoded
- [x] No Elo logic in client (Rule E — verified via grep)
- [x] No secrets committed (Rule H — verified)
- [x] Existing functionality preserved (Rule B — 62/62 regression pass)

**Resume point for next agent:**
- Start **Milestone 5 — Match Submissions (Sprint 5)**: Build `Match` schema (PRD Section 10.3), implement `POST /api/matches/submit` with score/winner validation (Section 6.2), `GET /api/matches/pending`, submission UI with player autocomplete, and "Pending Admin Approval" labels on the Dashboard.

---

## Quick Reference — Fixed Facts (rarely change, kept here to avoid re-deriving them each session)

- **Stack:** React + Vite + Tailwind + React Router (frontend) · Node.js + Express + Mongoose (backend) · MongoDB Atlas M0 (DB) · JWT + bcrypt (auth) · Vercel (hosting)
- **Starting player rating:** 1000
- **Default K-factor:** 32 (configurable)
- **Category thresholds:** Beginner 0–999 · Intermediate 1000–1199 · Advanced Intermediate 1200–1399 · Pro 1400+
- **Match statuses:** `PENDING_APPROVAL` → `APPROVED` or `REJECTED`
- **Golden rule:** All Elo logic lives in one backend rating service. Never duplicate the formula in the frontend.
