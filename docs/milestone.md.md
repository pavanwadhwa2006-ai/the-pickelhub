# The PickleHub — Project Milestones

Source: `prd-v2.md` (12-Week Development Roadmap, Section 14)
Tracking format: each milestone lists scope, key tasks, deliverables, and an acceptance checklist pulled from the PRD's Definition of Done (Section 16) and Non-Functional Requirements (Section 13). Check items off as they're completed.

---

## Milestone 0 — Pre-Development Setup
**Not a sprint, but required before Sprint 1 starts.**

- [x] Confirm free-tier accounts: MongoDB Atlas (M0), Vercel
- [x] Create GitHub repo with `.gitignore`, `README.md`, branch protection on `main`
- [x] Decide monorepo vs. separate `client/` + `server/` folders
- [x] Draft `.env.example` (no real secrets committed) — `MONGO_URI`, `JWT_SECRET`, etc.

---

## Milestone 1 — Foundation (Sprint 1)
**Goal:** Working skeleton repo with DB connectivity, nothing feature-complete yet.

**Tasks**
- [x] Initialize `client/` with Vite + React + Tailwind CSS + React Router
- [x] Initialize `server/` with Express.js boilerplate, folder structure (`routes/`, `models/`, `controllers/`, `services/`, `middleware/`)
- [x] Connect Mongoose to MongoDB Atlas M0 cluster
- [x] Set up environment variable handling on both client and server
- [x] Add base error-handling middleware and a health-check route (`GET /api/health`)
- [x] Set up ESLint/Prettier for consistent code style

**Deliverables**
- Runnable client (`npm run dev`) and server (`npm run dev`) locally
- Confirmed live connection to MongoDB Atlas

**Acceptance Checklist**
- [x] Server boots without errors and confirms DB connection in logs
- [x] No secrets committed to the repo (Rule H)

---

## Milestone 2 — Authentication (Sprint 2)
**Goal:** Secure registration/login with role-based access control.

**Tasks**
- [x] Build `User` schema (Section 10.1): email, password, role (`PLAYER`/`ADMIN`)
- [x] Implement password hashing with bcrypt/bcryptjs
- [x] Implement JWT issuing/verification
- [x] Build `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- [x] Build role-based route middleware distinguishing `PLAYER` vs `ADMIN`
- [x] Build basic client auth flow: register/login forms, token storage, protected routes

**Deliverables**
- Working register → login → protected-route flow end-to-end

**Acceptance Checklist**
- [x] Passwords never stored in plaintext
- [x] JWT secret pulled from environment, not hardcoded (Rule H)
- [x] Non-admins cannot access admin-only routes (verified with a manual test)

---

## Milestone 3 — Players (Sprint 3)
**Goal:** Player identity system and personal dashboard.

**Tasks**
- [x] Build `Player` schema (Section 10.2), linked to `User`
- [x] Implement unique Player ID generator (format `PH-00001`, sequential/atomic-safe)
- [x] Set default `currentRating` and `highestRating` to `1000`
- [x] Build `GET /api/players`, `GET /api/players/:id`, `GET /api/players/search`
- [x] Build Player Dashboard UI: rating, category, rank, match history placeholder
- [x] Add category-checking hook stub (full logic lands in Milestone 4/7)

**Deliverables**
- New user registration auto-creates a Player profile with a unique Player ID and starting rating of 1000

**Acceptance Checklist (ties to DoD #1)**
- [x] Users can register and receive a secured profile with starting rating `1000`
- [x] Player IDs are guaranteed unique even under concurrent registrations

---

## Milestone 4 — Rating Engine (Sprint 4)
**Goal:** Standalone, tested Elo calculation service — no UI dependency.

**Tasks**
- [x] Implement Expected Score formula $E_A = \frac{1}{1+10^{(R_B-R_A)/400}}$ (Section 7.1)
- [x] Implement Rating Update formula $R'_A = R_A + K\cdot(S_A - E_A)$, configurable K-factor (default 32)
- [x] Implement Doubles team-average logic and delta distribution (Section 7.2)
- [x] Centralize all Elo logic in a single backend rating service (Rule E — never duplicate formulas in React)
- [x] Write unit tests: singles wins/losses, doubles wins/losses, edge cases (equal ratings, extreme rating gaps)

**Deliverables**
- `ratingService.js` (or equivalent) fully unit-tested and importable by match/tournament logic

**Acceptance Checklist**
- [x] Test suite passes for singles and doubles scenarios (Rule M)
- [x] K-factor is read from config/DB, not hardcoded

---

## Milestone 5 — Match Submissions (Sprint 5)
**Goal:** Players can submit match results; nothing affects ratings yet.

**Tasks**
- [x] Build `Match` schema (Section 10.3)
- [x] Build `POST /api/matches/submit` — validates match type, court, participants, scores
- [x] Enforce match always created with status `PENDING_APPROVAL`
- [x] Build `GET /api/matches/pending` (player's own pending matches)
- [x] Build submission UI with player search/autocomplete for fast entry
- [x] Add "Pending Admin Approval" label on the Player Dashboard

**Deliverables**
- Full submission flow from UI to DB, visibly excluded from ratings

**Acceptance Checklist (ties to DoD #2, #3)**
- [x] A player can submit a match, entering `PENDING_APPROVAL` status
- [x] Pending match is completely hidden from Elo updates and the public leaderboard
- [x] All inputs validated server-side (Rule F)

---

## Milestone 6 — Leaderboard (Sprint 6)
**Goal:** Live, filterable public leaderboard.

**Tasks**
- [x] Build sortable leaderboard (primary sort: current rating, descending)
- [x] Filter by Category and Match Type (Singles/Doubles)
- [x] Only show active, non-suspended players
- [x] Build specialty leader blocks: Highest Rated, Most Wins, Highest Win % (min. 5 matches), Longest Active Streak
- [x] Build player search UI (`GET /api/players/search`) and head-to-head compare UI (`GET /api/players/compare`)

**Deliverables**
- Public leaderboard page, responsive and filterable

**Acceptance Checklist**
- [x] Leaderboard reflects only `APPROVED` match data (no pending/rejected leakage)
- [x] Mobile layout verified (Rule I)

---

## Milestone 7 — Admin Approvals Queue (Sprint 7)
**Goal:** The core trust mechanism of the platform — atomic, auditable match approval.

**Tasks**
- [x] Build Admin "Pending Approvals" screen (`GET /api/admin/matches/pending`)
- [x] Implement `POST /api/admin/matches/:id/approve`:
  - [x] Guard: abort if `match.status !== 'PENDING_APPROVAL'` (double-processing prevention, Section 12.2)
  - [x] Run Elo calculation, update player ratings, append `RatingHistory`, update stats/streaks, recalc categories, update leaderboard — as a single MongoDB transaction (Section 12.1)
- [x] Implement `POST /api/admin/matches/:id/reject` with required rejection reason, status → `REJECTED`, no rating side effects
- [x] Implement `POST /api/admin/matches/direct` for admin direct entry (auto-`APPROVED`, bypasses queue)
- [x] Add category-crossing notification trigger
- [x] Build `AuditLog` schema (Section 10.6) and write an audit entry for every approval/rejection

**Deliverables**
- End-to-end approve/reject flow with atomic DB transactions and audit trail

**Acceptance Checklist (ties to DoD #4, #5, #6, #7)**
- [x] Admin can view, approve, or reject from an admin-only route
- [x] Approving updates ratings, categories, stats, leaderboard, and rating history atomically
- [x] Rejecting preserves the record as `REJECTED`, stores the reason, updates nothing else
- [x] Concurrent-approval race condition tested and blocked (Section 12.3)
- [x] Every admin action has a matching audit log entry (Rule G)

---

## Milestone 8 — Tournaments (Sprint 8)
**Goal:** Tournament creation, brackets, and separate bonus system.

**Tasks**
- [ ] Build `Tournament` schema/model (Section 9.1): states, type, category, participants, bracket, matches, winner/runner-up
- [ ] Build bracket generator (Singles/Doubles/Mixed/Category-based/Open)
- [ ] Implement configurable tournament rating bonuses (Winner +50, Runner-up +25, Semi-finalist +10 defaults), stored in DB and admin-editable
- [ ] Apply bonuses via `RatingHistory` with `changeType: 'TOURNAMENT_BONUS'`, separate from normal match Elo
- [ ] Build admin tournament management UI + player-facing Tournament Hub (view brackets/rules)

**Deliverables**
- Admin can run a full tournament from creation to bonus payout

**Acceptance Checklist**
- [ ] Tournament bonuses never distort standard match-based Elo calculations
- [ ] Bonus values configurable without code changes

---

## Milestone 9 — Analytics (Sprint 9)
**Goal:** Player-facing performance insight via Recharts.

**Tasks**
- [ ] Integrate Recharts for historical Elo tracking graph (pulled from `RatingHistory`)
- [ ] Build match-win analysis views (win/loss trends, streaks)
- [ ] Build head-to-head comparison page (`GET /api/players/compare`)
- [ ] Add manual rating adjustment tool for admins (`POST /api/admin/ratings/adjust`) with required audit reason
- [ ] Add match correction endpoint (`PUT /api/admin/matches/:id/correct`) that re-triggers historical Elo recalculation

**Deliverables**
- Player profile page with rating graph and stats; admin correction/adjustment tools live

**Acceptance Checklist**
- [ ] No manual adjustment or correction can occur without an audit log entry (Rule G, Section 13 "No Quiet Changes")

---

## Milestone 10 — UI Polish (Sprint 10)
**Goal:** Production-quality UX across the whole app.

**Tasks**
- [ ] Full responsive/mobile-first pass on every screen (Rule I)
- [ ] Add loading states, empty-state placeholders, and error states throughout
- [ ] Add transition/animation polish
- [ ] Deduplicate shared UI into reusable components (Rule K)
- [ ] Accessibility pass (contrast, tap targets, keyboard nav where relevant)

**Deliverables**
- Consistent, polished UI ready for real-world use on phones and desktop

---

## Milestone 11 — Testing (Sprint 11)
**Goal:** Confidence that the rating/approval core is correct and secure.

**Tasks**
- [ ] Security review: JWT handling, role checks on every protected route, input sanitization
- [ ] Concurrency test: simulate simultaneous approval requests on the same match
- [ ] Full regression pass on rating engine unit tests (Rule M)
- [ ] Mobile UX validation across common breakpoints/devices
- [ ] Verify no mock data remains in any production code path (Rule D)
- [ ] Verify no dead/fake buttons remain (Rule C)

**Deliverables**
- Test report covering security, concurrency, and mobile UX

---

## Milestone 12 — Deployment (Sprint 12)
**Goal:** Live, production-ready platform.

**Tasks**
- [ ] Configure production environment variables on Vercel (JWT secret, Mongo URI, etc.) — never in source (Rule H)
- [ ] Deploy frontend + serverless backend API to Vercel
- [ ] Confirm MongoDB Atlas production cluster access and indexes (per schema `index: true` fields)
- [ ] Run live end-to-end test: register → submit match → admin approve → leaderboard updates
- [ ] Run end-to-end test on mobile screens
- [ ] Final documentation update if any architecture changed since PRD (Rule J)
- [ ] Handover / project wrap-up notes

**Acceptance Checklist (Final Definition of Done — Section 16)**
- [ ] Users register with starting rating `1000`
- [ ] Player match submission enters `PENDING_APPROVAL`
- [ ] Pending matches are hidden from Elo/leaderboard
- [ ] Admin can view/approve/reject from an admin-only route
- [ ] Approval atomically updates ratings, categories, stats, leaderboard, rating history
- [ ] Rejection preserves record, reason, and blocks rating updates
- [ ] Full audit trails exist for manual adjustments/corrections
- [ ] App deployed to Vercel + MongoDB Atlas and passes end-to-end mobile testing

---

## Cross-Cutting Rules (apply to every milestone)
Pulled from PRD Section 15 — check these at every PR/merge, not just at the end:
- [ ] Rule A — Understand existing code before changing it
- [ ] Rule B — Don't break existing features
- [ ] Rule C — No fake/non-functional UI
- [ ] Rule D — No mock data in production flows
- [ ] Rule E — Elo logic lives only in the backend rating service
- [ ] Rule F — Validate all inputs
- [ ] Rule G — Never silently alter ratings/results
- [ ] Rule H — No secrets in source code
- [ ] Rule I — Mobile-first on every screen
- [ ] Rule J — Update docs on architecture changes
- [ ] Rule K — Reuse components, no duplicated UI logic
- [ ] Rule L — Meaningful naming everywhere
- [ ] Rule M — Test every change to rating logic
