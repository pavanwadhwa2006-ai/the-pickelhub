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

- **Last completed milestone:** Milestone 7 — Admin Approvals Queue (Sprint 7)
- **In progress:** None
- **Next milestone to start:** Milestone 8 — Tournaments (Sprint 8)
- **Repo state:** Client builds cleanly with zero errors/warnings (Oxlint 0/0, Vite 510 modules); Server test suites pass (94/94 tests ok); Full multi-document ACID transaction engine operational on MongoDB Atlas replica set; Standing CI guardrails checking mock data and dead interactive elements (`npm run ci:guardrails`); Framer Motion-powered Admin Control Panel live at `/admin` with live pending badges, approval/reject queue cards, animated rejection modal, direct official match recording, and governance audit trail.
- **Environment/deploy state:** Local development (`client: localhost:5173`, `server: localhost:5000`)
- **Last updated:** 2026-09-01 by AI Coding Agent (Milestone 7 Admin Approvals Queue Complete)

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
- Milestone 4 completed. Proceed to Milestone 5.

---

### Milestone 5 — Match Submissions (Sprint 5)
- **Status:** Completed
- **Date:** 2026-08-22
- **Session/Agent:** Sprint 5

**What was built:**
- `Match.js` Mongoose model per PRD Section 10.3:
  - `matchId` (`PH-M00001`), `court`, `matchType` (`SINGLES`/`DOUBLES`), `teamA`, `teamB`, `scores`, `winnerTeam`, `status` (`PENDING_APPROVAL`), `submittedBy`, `ratingChanges`, `recordedByAdmin`, `correction`.
- Match submission controller & validation logic in `matchController.js` and `matchRoutes.js`:
  - `POST /api/matches/submit` (Protected) — validates participant counts (1v1 for Singles, 2v2 for Doubles), disallows duplicate participants within or across teams, rejects game-level ties (PRD 6.2.3), rejects match-level ties (PRD 6.2.4), and enforces declared `winnerTeam` consistency with majority games won (PRD 6.2.2).
  - `GET /api/matches/pending` (Protected) — returns active matches awaiting administrator verification for the current player.
  - `GET /api/matches/my-history` (Protected) — returns player's approved match history.
  - `GET /api/matches/:id` (Protected) — returns single populated match details.
- Player directory autocomplete search `GET /api/players/search?q=...` supporting both `q` and `query` params, sanitized projection, and suspended-player filtering.
- Frontend Match Recording UI in `SubmitMatchPage.jsx` (`/matches/submit`):
  - Singles/Doubles toggle, court selector, tournament checkbox.
  - Interactive player pickers with live debounce search.
  - Dynamic game score inputs with auto-computed game-winner detection.
  - Real-time series decision calculations.
- Integrated active pending match indicators and submission link in `DashboardPage.jsx`.
- Comprehensive unit test suite in `server/test/match.test.js` (14 new test cases across 2 suites).

**Files touched:**
- `server/src/models/Match.js` (NEW)
- `server/src/controllers/matchController.js` (NEW)
- `server/src/routes/matchRoutes.js` (NEW)
- `server/src/controllers/playerController.js`
- `server/src/server.js`
- `server/test/match.test.js` (NEW)
- `server/package.json`
- `client/src/pages/SubmitMatchPage.jsx` (NEW)
- `client/src/pages/DashboardPage.jsx`
- `client/src/App.jsx`
- `docs/milestone.md.md`
- `docs/MEMORY.md`

**Key decisions made:**
- Matches strictly created in `PENDING_APPROVAL` status. Rating engine is not triggered on submission, preserving DoD #2 and #3.
- Submitter must be a match participant (in `teamA` or `teamB`) unless the user is an `ADMIN`.

**Deviations from PRD:** None.

**Tests run and results:**
- `node --test test/match.test.js` — 14/14 pass
- `npm test` (full regression) — 76/76 pass (auth + player + duplicate_email + rating + match)
- `npm run lint` (client oxlint) — 0 errors, 0 warnings (28 files)
- `npm run build` (client vite) — built in 1.32s with 0 errors

**Acceptance checklist status:**
- [x] A player can submit a match, entering `PENDING_APPROVAL` status (DoD #2)
- [x] Pending match is completely hidden from Elo updates and the public leaderboard (DoD #3)
- [x] All inputs validated server-side (Rule F, DoD #8)

**Resume point for next agent:**
- Milestone 5 completed. Proceed to Milestone 6.

---

### Milestone 6 — Leaderboard (Sprint 6)
- **Status:** Completed
- **Date:** 2026-08-22
- **Session/Agent:** Sprint 6

**What was built:**
- Backend Leaderboard & Specialty Endpoints in `playerController.js` and `playerRoutes.js`:
  - `GET /api/players` — Multi-sort (`rating`, `wins`, `winPercentage`, `streak`, `matches`), category filtering (`ALL`, `BEGINNER`, `INTERMEDIATE`, `ADVANCED_INTERMEDIATE`, `PRO`), search by name/ID, and strict active-only filtering.
  - `GET /api/players/leaders` — Computes 4 specialty leader blocks (Highest Rated, Most Wins, Highest Win Rate requiring `matchesPlayed >= 5` per PRD Section 8.2, and Longest Active Winning Streak).
  - `GET /api/players/compare?p1=...&p2=...` — Head-to-head comparison engine computing historical approved match records and algorithmic win probabilities using `calculateExpectedScore` from `ratingService.js`.
- Frontend Leaderboard UI in `LeaderboardPage.jsx` (`/leaderboard`):
  - 4 Specialty Leader showcase cards with count-up animations.
  - Interactive category filter tabs and multi-sort dropdown.
  - Real-time search bar for player name and `PH-XXXXX` lookup.
  - Standings table with top-3 gold/silver/bronze badges, tier pills, dynamic ratings, records, streaks, and quick compare buttons.
  - Head-to-head matchup modal featuring animated win probability gauge, stat differentials, and direct matchup history.
- Backend test suite `server/test/leaderboard.test.js` (6 new test cases across 2 suites).

**Files touched:**
- `server/src/controllers/playerController.js`
- `server/src/routes/playerRoutes.js`
- `server/test/leaderboard.test.js` (NEW)
- `server/package.json`
- `client/src/pages/LeaderboardPage.jsx`
- `docs/milestone.md.md`
- `docs/MEMORY.md`

**Key decisions made:**
- Win % leader strictly enforces the minimum 5 matches played threshold (PRD Section 8.2) to prevent players with a 1-0 record from overtaking active competitors.
- Head-to-head win probabilities are computed via the centralized Elo formula (`calculateExpectedScore`).

**Deviations from PRD:** None.

**Tests run and results:**
- `node --test test/leaderboard.test.js` — 6/6 pass
- `npm test` (full regression) — 82/82 pass (auth + player + duplicate_email + rating + match + leaderboard)
- `npm run lint` (client oxlint) — 0 errors, 0 warnings (28 files)
- `npm run build` (client vite) — built in 1.31s with 0 errors

**Acceptance checklist status:**
- [x] Leaderboard reflects only `APPROVED` match data (no pending/rejected leakage)
- [x] Specialty leader blocks calculate correctly with min-5 threshold
- [x] Mobile layout verified (Rule I)

**Resume point for next agent:**
- Milestone 6 completed.

---

### Milestone 6.5 — Garden Light Theme & Vercel Blob Profile Photo Upload
- **Status:** Completed
- **Date:** 2026-08-22
- **Session/Agent:** Theme & Avatar Sprint

**What was built:**
- **"Garden Light" Jewel-Tone Botanical Theme (`data-theme="garden-light"`)**:
  - Soft beige-cream base (`#FBF8ED`), clean white cards (`#FFFFFF`), beige stat tile tint (`#F7F4D5`), warm hairline border (`#E5DFC4`), near-midnight green-black text (`#10241F`), muted sage-gray text (`#5C6B62`).
  - Sapphire primary brand accent (`#1D3461`), sapphire hover (`#16294D`), royal blue secondary (`#2C4A7C`).
  - Meaningful Skill Tier Ladder: Beginner = Quicksand (`#B9AE7E`), Intermediate = Rosy brown (`#D3968C`), Adv. Intermediate = Moss green (`#839958`), Pro Division = Midnight green (`#10586B`).
  - Complete semantic CSS mapping across all layouts and component classes.
- **Theme Engine & Controls**:
  - `ThemeContext.jsx`, `themeConstants.js`, `useTheme.js` with `localStorage` persistence.
  - Radio-style theme selector inside `ProfileSettingsMenu.jsx` for "Classic dark" vs "Garden light".
- **Vercel Blob Avatar Upload Pipeline**:
  - `server/src/services/storageService.js`: Uploads image buffer to Vercel Blob (`@vercel/blob`) with automatic fallback data-URI in offline/test environments, and deletes blobs on removal.
  - `server/src/controllers/profileController.js` & `server/src/routes/profileRoutes.js`: `POST /api/profile/photo` (5MB max, format validation for PNG/JPEG/WEBP) and `DELETE /api/profile/photo`.
  - `Player.profilePhoto` established as the canonical **Single Source of Truth** (no duplicate field on `User`).
  - `ProfileSettingsMenu.jsx`: Camera icon overlay on avatar, client-side validation, live object URL preview, loading ring, inline error state, and "Remove photo" link.
  - Dynamic avatar rendering in `Navbar.jsx`, `DashboardPage.jsx`, and `PlayerProfilePage.jsx`.
- **Testing & Documentation**:
  - `server/test/profile.test.js` (5 test cases passing).
  - Appended Garden Light spec to `docs/DESIGN.md`.

**Files touched:**
- `server/src/services/storageService.js` (NEW)
- `server/src/controllers/profileController.js` (NEW)
- `server/src/routes/profileRoutes.js` (NEW)
- `server/src/server.js`
- `server/test/profile.test.js` (NEW)
- `server/package.json`
- `client/src/context/themeConstants.js` (NEW)
- `client/src/context/ThemeContext.jsx` (NEW)
- `client/src/context/useTheme.js` (NEW)
- `client/src/components/ProfileSettingsMenu.jsx` (NEW)
- `client/src/components/Navbar.jsx`
- `client/src/pages/DashboardPage.jsx`
- `client/src/pages/PlayerProfilePage.jsx`
- `client/src/index.css`
- `client/src/main.jsx`
- `docs/DESIGN.md`
- `docs/MEMORY.md`

**Tests run and results:**
- `npm test` (full backend regression) — 87/87 pass (auth + player + duplicate_email + rating + match + leaderboard + profile)
- `npm run lint` (client oxlint) — 0 errors, 0 warnings (32 files)
- `npm run build` (client vite) — built in 828ms with 0 errors

**Resume point for next agent:**
- Milestone 6.5 completed. Proceed to Milestone 7.

---

### Milestone 7 — Admin Approvals Queue (Sprint 7)
- **Status:** Completed
- **Date:** 2026-09-01
- **Session/Agent:** Sprint 7 (Admin Governance & Atomic Transactions)

**What was built:**
- **Pre-flight verification:** Confirmed MongoDB Atlas cluster replica set (`atlas-2fbsuh-shard-0`) supporting multi-document ACID transactions via `session.startTransaction()`.
- **`AuditLog` Mongoose Model (`server/src/models/AuditLog.js`)**:
  - Implements PRD Section 10.6: `action` (`MATCH_APPROVE`, `MATCH_REJECT`, `DIRECT_MATCH_CREATE`, `MANUAL_RATING_ADJUST`), `performedBy` (ref: User), `targetType`, `targetId`, `metadata`, `createdAt` with compound index.
- **`RatingHistory` Mongoose Model (`server/src/models/RatingHistory.js`)**:
  - Implements PRD Section 10.4: `playerId` (ref: Player), `changeType` (`MATCH`, `TOURNAMENT_BONUS`, `MANUAL_ADJUSTMENT`), `matchId`, `ratingBefore`, `ratingAfter`, `delta`, `categoryBefore`, `categoryAfter`, `createdAt` with compound index.
- **Shared Atomic Approval Engine (`server/src/services/adminService.js`)**:
  - `executeAtomicMatchApproval`: executes in a single MongoDB transaction.
  - Concurrency guard: checks `match.status === 'PENDING_APPROVAL'` (throws 409 Conflict if already processed).
  - Calculates exact Elo deltas via `ratingService.calculateMatchRatingChanges`.
  - Atomically updates player ratings, categories, wins/losses/streaks, matchesPlayed.
  - Appends `RatingHistory` records.
  - Updates `Match` document (`status: 'APPROVED'`, `approvedBy`, `approvedAt`, `ratingChanges`).
  - Creates immutable `AuditLog` entry.
  - Aborts transaction on any failure with zero partial mutations.
- **Administrative Endpoints (`server/src/controllers/adminController.js` & `server/src/routes/adminRoutes.js`)**:
  - `GET /api/admin/matches/pending` — Paginated pending matches sorted oldest-first.
  - `POST /api/admin/matches/:id/approve` — Transaction-safe approval with 409 guard.
  - `POST /api/admin/matches/:id/reject` — Requires rejection reason (400 if empty), sets status to `REJECTED`, creates audit log, zero rating side-effects.
  - `POST /api/admin/matches/direct` — Direct entry for official club games, auto-approved with immediate atomic rating calculation.
  - `GET /api/admin/audit-logs` — Administrative audit trail inspection with pagination.
- **Frontend Admin Command Center (`client/src/pages/AdminPage.jsx`)**:
  - Framer Motion micro-interactions:
    - Hover scale (`whileHover={{ scale: 1.03 }}`) & color transitions for Approve (emerald) and Reject (rose).
    - Exit animation (`<AnimatePresence>` with `exit={{ opacity: 0, x: 40 }}`) on approval/rejection.
    - Loading skeletons: 3 pulsing placeholder rows.
    - Empty state: Custom zero-pending illustration & message.
    - Reject modal: Animated fade + scale with reason validation.
    - Direct official match entry form with debounced player autocomplete and score chips.
    - Governance audit trail table.
    - Full dual-theme fidelity (Classic Dark / Garden Light).
- **CI Guardrail (`scripts/ci-guardrails.js`)**:
  - Automated check scanning for mock/dummy data fixtures and dead interactive buttons/links.
  - Added `"ci:guardrails"` script to root `package.json` and integrated into `"npm run lint"`.
  - Documented as standing requirement in `agent.md/AGENTS.md`.
- **Automated Test Suite (`server/test/adminApprovals.test.js`)**:
  - 7 comprehensive tests across 5 suites covering Singles/Doubles Elo deltas, 409 double-approval guard, mid-transaction rollback atomicity, reject validation/safety, and direct official recording.

**Files touched:**
- `server/src/models/AuditLog.js` (NEW)
- `server/src/models/RatingHistory.js` (NEW)
- `server/src/services/adminService.js` (NEW)
- `server/src/controllers/adminController.js` (NEW)
- `server/src/routes/adminRoutes.js` (NEW)
- `server/src/server.js`
- `server/test/adminApprovals.test.js` (NEW)
- `server/package.json`
- `client/src/pages/AdminPage.jsx`
- `client/package.json`
- `scripts/ci-guardrails.js` (NEW)
- `package.json`
- `agent.md/AGENTS.md`
- `docs/milestone.md.md`
- `docs/MEMORY.md`

**Tests run and results:**
- `npm test` (full backend regression) — 94/94 pass (auth + player + duplicate_email + rating + match + leaderboard + profile + adminApprovals)
- `npm run lint` (server ESLint + client Oxlint + CI Guardrails) — 0 errors, 0 warnings (33 client files, 32 scanned UI files)
- `npm run build` (client Vite production bundle) — built in 517ms with 0 errors

**Acceptance checklist status:**
- [x] Admin can view, approve, or reject from an admin-only route (DoD #4, #5, #6)
- [x] Approving updates ratings, categories, stats, leaderboard, and rating history atomically (DoD #4)
- [x] Rejecting preserves the record as `REJECTED`, stores the reason, updates nothing else (DoD #5)
- [x] Concurrent-approval race condition tested and blocked (Section 12.3)
- [x] Every admin action has a matching audit log entry (Rule G, DoD #7)

**Resume point for next agent:**
- Milestone 7 completed. Proceed to **Milestone 8 — Tournaments (Sprint 8)**: Implement `Tournament` schema (`src/models/Tournament.js`), bracket generator, configurable tournament rating bonus system (+50 winner, +25 runner-up, +10 semi-finalist defaults), tournament management UI, and player tournament hub.

---

## Quick Reference — Fixed Facts (rarely change, kept here to avoid re-deriving them each session)

- **Stack:** React + Vite + Tailwind + React Router (frontend) · Node.js + Express + Mongoose (backend) · MongoDB Atlas M0 (DB) · JWT + bcrypt (auth) · Vercel (hosting)
- **Starting player rating:** 1000
- **Default K-factor:** 32 (configurable)
- **Category thresholds:** Beginner 0–999 · Intermediate 1000–1199 · Advanced Intermediate 1200–1399 · Pro 1400+
- **Match statuses:** `PENDING_APPROVAL` → `APPROVED` or `REJECTED`
- **Golden rule:** All Elo logic lives in one backend rating service. Never duplicate the formula in the frontend.

