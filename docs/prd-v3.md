# The PickleHub — Product Requirement Document (PRD) v3

**Changelog from v2:** This revision resolves ambiguities identified in a design review of v2 — doubles Elo fairness, score/winner validation, tie handling, match correction cascading, category-crossing notification noise, Player ID concurrency, direct-entry audit logging, suspended-player data handling, tournament seeding, and basic abuse prevention. All original v2 content is preserved; changes are additive or clarifying, marked with **[v3]** where new.

---

## 1. Project Identity & Positioning
* **Project Name:** The PickleHub
* **Project Type:** Full-stack sports-tech web application
* **Domain:** Competitive Pickleball player management, ratings, matches, and tournaments.
* **Primary Goal:** Build a professional player rating and ranking ecosystem for matches played at The PickleHub.

### Core Experience
```
PLAY ➔ RECORD/SUBMIT ➔ ADMIN APPROVAL ➔ GET RATED ➔ IMPROVE ➔ CLIMB ➔ COMPETE
```

### Core Positioning
The PickleHub is not simply a pickleball court business website. It is a competitive sports-tech platform that records official matches, calculates player ratings using an Elo-style algorithm, categorizes players by skill, maintains historical rankings, manages tournaments, and provides player performance analytics.

---

## 2. Problem Statement
Pickleball players often lack a structured system to track their competitive performance at a local court or club.
The PickleHub solves this by creating an exclusive ranking ecosystem where matches played at The PickleHub are recorded and used to calculate player ratings, rankings, skill categories, statistics, and tournament performance.
Only matches officially recorded/approved at The PickleHub contribute to the official PickleHub Rating.

---

## 3. Project Objectives
1. **Centralized Player Management:** A single system of record for all club players.
2. **Unique Player Identities:** Assign every registered player a unique profile and Player ID (e.g., `PH-00001`).
3. **Automated Elo-style Rating Engine:** Calculate ratings dynamically based on match outcomes and opponent strength.
4. **Historical Tracking:** Maintain detailed history of player ratings, leaderboard ranks, and category transitions.
5. **Dynamic Player Categorization:** Automatically group players into skill levels based on rating thresholds.
6. **Competitive Leaderboard:** A live, sortable, and filterable ranking dashboard.
7. **Flexible Match Processing:** Support both Singles and Doubles matches.
8. **Transparent Verification Workflow:** Support player-submitted matches that must undergo Admin review and approval before affecting rankings.
9. **Performance Analytics:** Track player statistics, winning streaks, and head-to-head comparisons.
10. **Tournament Management:** Provide tools to create tournaments, manage brackets, and award separate rating bonuses.
11. **Comprehensive Admin Dashboard:** Enable administrators to manage users, configure settings, and oversee data integrity.
12. **Mobile-First Sports-Tech UX:** Deliver a premium, fast, responsive experience optimized for mobile devices.
13. **Zero-Budget Deployment:** Leverage free-tier cloud architectures for initial MVP release.
14. **Extensible Architecture:** Design highly modular systems prepared for future feature sets (e.g., court booking, subscriptions).

---

## 4. Target Users & Access Roles

### 4.1 Players
Players represent the core competitive community. They are authorized to:
* **Profile Management:** Register, log in, manage profiles, and track progress.
* **Dashboard Access:** View personal Elo rating, skill category, rank, and detailed match history.
* **Match Submission:** Submit match outcomes (scores, players, court) for peer matches. Submissions are flagged as `PENDING_APPROVAL`.
* **Community Search & Comparison:** Search other players, view public profiles, and run head-to-head comparisons.
* **Tournament Hub:** View upcoming tournaments, rules, and brackets.

### 4.2 Administrators
Admins maintain platform authority, data integrity, and operational control. They are authorized to:
* **Approval Queue Management:** Approve or reject player-submitted matches to ensure rating transparency and prevent score manipulation.
* **Direct Match Recording:** Directly record official matches (bypasses approval queue; auto-approved).
* **Player Directory Operations:** Create, edit, suspend, or delete player accounts.
* **Manual Adjustments:** Apply manual Elo adjustments with required audit justification.
* **Match Corrections:** Edit, correct, or cancel previously processed match results.
* **Tournament Operations:** Create tournaments, manage participants, generate brackets, configure rating bonuses, and record tournament results.
* **Settings Configuration:** Adjust rating thresholds, rating engine K-factors, and court listings.
* **Audit Logs:** Monitor system audit reports for all administrative actions.

---

## 5. Technology Stack & Deployment Strategy

### 5.1 Technology Stack
* **Frontend:** React, Vite, Tailwind CSS, React Router, Recharts, Axios or Fetch.
* **Backend:** Node.js, Express.js, Mongoose, REST API architecture.
* **Database:** MongoDB Atlas (M0 free shared cluster).
* **Authentication:** JWT, bcrypt/bcryptjs, role-based authorization.
* **Development & Deployment:** Git, GitHub, VS Code, Vercel (frontend and serverless backend API).

### 5.2 Zero-Budget Constraint
The initial system must operate entirely within the free-tier structures of modern cloud hosting providers. Paid subscriptions are prohibited.
* **Hosting:** Vercel (using serverless functions for the Node.js backend).
* **Database:** MongoDB Atlas M0 Free Shared Cluster.
* **No Paid Services Policy:** No paid custom domains, paid third-party transactional email, paid SMS APIs, or paid payment gateways in the initial MVP.

### 5.3 Basic Abuse Prevention **[v3]**
* Rate-limit `POST /api/auth/login`, `POST /api/auth/register`, and `POST /api/matches/submit` per IP and per user (e.g., simple in-memory or MongoDB-backed limiter — no paid service required).
* Lock or flag accounts after repeated failed login attempts (configurable threshold, default 5 within 15 minutes).
* These are MVP-level protections, not a substitute for a full WAF; acceptable given the zero-budget constraint.

---

## 6. The Match Approval Workflow (Transparent Score Protection)

To prevent rating inflation, score manipulation, or honest entry errors, The PickleHub uses a **two-phase verification architecture** for player-entered matches.

```
       [ Match Concludes On Court ]
                   |
                   v
       [ Player Submits Score via App ]
                   |
                   v
       Match created as 'PENDING_APPROVAL'
       (No ratings/leaderboard updated yet)
                   |
                   v
     [ Admin Reviews in Approval Queue ]
                   |
         +---------+---------+
         |                   |
         v (Approved)        v (Rejected)
  [ Status: APPROVED ]     [ Status: REJECTED ]
  1. Calculate Elo         1. Save audit record
  2. Update ratings        2. Match remains inactive
  3. Update statistics     3. Rejection reason shown
  4. Recalculate ranks        to players
```

### 6.1 Submission Policy
1. Any registered player involved in a match can submit the final score.
2. The submitter must specify: match type (Singles/Doubles), court number, all participating players, and game-by-game scores.
3. Upon submission, the match is written to the database with the status set to `PENDING_APPROVAL`.
4. Players can view their pending submissions on their Player Dashboard, clearly labeled as **"Pending Admin Approval"**.

### 6.2 Score & Winner Validation **[v3 — resolves ambiguity]**
1. A match consists of one or more games, each with a `teamAScore`/`teamBScore` pair.
2. The submitted `winnerTeam` field must be consistent with the game scores: the winner is the team that won the majority of games in the `scores[]` array (best-of-N, majority rule). Reject the submission at the API level if `winnerTeam` contradicts the majority of game scores.
3. **No draws are permitted at the game level.** A single game cannot have `teamAScore === teamBScore`; reject any submission containing such a game.
4. **No draws are permitted at the match level.** If `scores[]` has an even number of games, it must not produce a tied game count between teams; reject the submission if it does (this should not occur in a valid best-of-N series, but must be validated defensively).
5. Standard pickleball scoring bounds should be validated where feasible (e.g., winning score ≥ 11 with a 2-point margin for standard games, or ≥ 15/21 for extended formats) — configurable, not hardcoded, so admins can adjust for house rules.

### 6.3 Verification and Processing
1. **The Admin Queue:** Submitted matches appear in the Admin Dashboard's "Pending Approvals" screen. The admin can verify the scores with physical logs or confirmation from other players.
2. **Approval Action:**
   * The admin clicks **"Approve"**.
   * The system transitions the match status to `APPROVED`.
   * The **Rating Engine** is triggered in a single database transaction:
     * Elo rating updates are calculated for all participating players.
     * New ratings are saved to individual player documents.
     * Historical rating records are appended to the `ratingHistory` collection.
     * Player match statistics (wins, losses, streaks) are incremented.
     * Skill categories are recalculated based on new ratings.
     * The public leaderboard is updated.
3. **Rejection Action:**
   * If the scores are incorrect or fraudulent, the admin clicks **"Reject"**.
   * The admin must provide a **Rejection Reason** (e.g., "Opponent disputed score", "Incorrect player names").
   * The status transitions to `REJECTED`.
   * The match remains in history for audit purposes, but **no ratings, categories, or statistics are updated**.
   * A notification/alert is shown to the players involved.
4. **Admin Direct Entry Exception:** Matches entered directly by an administrator are auto-populated as `APPROVED` and bypass the queue entirely. **[v3]** This path still writes an `AuditLog` entry (`action: 'MATCH_RECORDED_DIRECT'`) — the "No Quiet Changes" principle (Section 13) applies to direct entry exactly as it applies to approvals.

---

## 7. Rating Engine & Algorithmic Design

### 7.1 The PickleHub Elo Formula
The rating engine must use an Elo-style algorithm where rating changes depend directly on opponent strength, preventing flat-point award manipulation.

* **Default Starting Rating:** 1000
* **Standard Sensitivity Constant (K-factor):** 32 (configurable by administrator)

#### 1. Expected Score Calculation
The expected score $E_A$ for a player (or team) relative to their opponent is calculated as:
$$E_A = \frac{1}{1 + 10^{(R_B - R_A) / 400}}$$
Where:
* $R_A$ is Player A's current rating.
* $R_B$ is Player B's current rating.

#### 2. Rating Update Calculation
Once the match is finalized (`APPROVED` status), the new rating is computed:
$$R'_A = R_A + K \cdot (S_A - E_A)$$
Where:
* $S_A$ is the Actual Score: 1 for a win, 0 for a loss.
* $K$ is the sensitivity constant (default: 32).

### 7.2 Doubles Elo Rating Policy **[v3 — resolves fairness ambiguity]**
For Doubles matches, The PickleHub uses **team-average expected score with individually-weighted delta distribution**, rather than a flat identical delta for both teammates. This prevents a strong player from "farming" rating by pairing with a weak partner, and prevents a strong player from being unfairly penalized while carrying a weak partner.

1. **Team Rating Calculation:** Determine the average rating of Team A ($R_{TeamA} = \frac{R_{A1} + R_{A2}}{2}$) and Team B ($R_{TeamB} = \frac{R_{B1} + R_{B2}}{2}$).
2. **Expected Outcome:** Compute the expected score $E_{TeamA}$ and $E_{TeamB}$ using the averaged team ratings.
3. **Calculate Team Delta:** Calculate the total rating delta ($\Delta_{Team}$) based on the match outcome:
   $$\Delta_{Team} = K \cdot (S_{Team} - E_{Team})$$
4. **Distribute Delta by Individual Deviation from Team Average:** Instead of applying $\Delta_{Team}$ identically to both players, weight each player's share by how far their individual rating sits from their team's average, using a bounded weighting factor $w \in [0.75, 1.25]$:
   * A player rated **below** their team average receives a **larger** share of a positive delta (they were "carried," so a win teaches more) and a **smaller** share of a negative delta (they were carried, so a loss is less "their fault").
   * A player rated **above** their team average receives a **smaller** share of a positive delta (expected result) and a **larger** share of a negative delta (an upset loss is more informative for a stronger player).
   * Formula: for player $i$ on a team with average $R_{Team}$, deviation $d_i = R_i - R_{Team}$, normalized weight $w_i = \text{clamp}(1 - \frac{d_i}{800}, 0.75, 1.25)$, individual delta $\delta_i = \Delta_{Team} \cdot w_i$, with the pair's two weights re-normalized so $\delta_{i1} + \delta_{i2}$ still sums to a value consistent with $\Delta_{Team}$ (i.e., average of the two deltas equals $\Delta_{Team}$).
   * **MVP fallback (acceptable simplification):** If individually-weighted distribution is deferred past MVP, the team may instead apply an identical $\Delta_{Team}$ to both players (the original v2 behavior). This must be an explicit, documented decision recorded in `MEMORY.md`, not a silent simplification, since switching approaches later requires recalculating historical ratings.

---

## 8. Player Categories & Leaderboard

### 8.1 Rating Thresholds
Players are placed into skill brackets dynamically derived from their current Elo rating. These thresholds must reside in the database and must be configurable by admins rather than being hardcoded on the frontend.

| Category | Rating Range |
| :--- | :--- |
| **Beginner** | 0 – 999 |
| **Intermediate** | 1000 – 1199 |
| **Advanced Intermediate** | 1200 – 1399 |
| **Pro** | 1400+ |

**Categorization Rules:**
* Every Elo change triggers a recalculation of the player's category.
* Category crossings are logged and trigger in-app system notifications.
* **[v3] Notification debounce:** To prevent notification spam for players hovering near a threshold boundary, category-crossing notifications are debounced per player: at most one crossing notification per player per rolling 24-hour window. All crossings are still logged to `ratingHistory`/category-change records regardless of notification debounce — only the user-facing notification is throttled, not the data.

### 8.2 Leaderboard Operations
* **Primary Sort:** Current PickleHub Rating (descending).
* **Requirements:** Only active, non-suspended players are shown.
* **Filters:** Support filtering by Category and Match Type (Singles vs. Doubles).
* **Additional Leaders:** Display specialty blocks for:
  * Highest Rated Player
  * Most Wins
  * Highest Win % (minimum 5 matches played)
  * Longest Active Winning Streak

### 8.3 Suspended Player Data Handling **[v3 — resolves ambiguity]**
* A suspended player's **past approved matches remain fully valid** — their historical rating impact on opponents is never retroactively removed.
* A suspended player is excluded from the public leaderboard and specialty leader blocks (Section 8.2) while suspended, but their profile and history remain visible to admins and, if permitted, to themselves.
* Wins/losses against a since-suspended opponent **continue to count** toward the *opponent's* stats, streaks, and specialty leaderboard eligibility — suspension is a status on the account, not a retroactive nullification of past matches.
* A suspended player cannot submit new matches or appear in new match submissions (validated server-side).

---

## 9. Tournament System & Bonuses

### 9.1 Tournament Structure
Admins can create Singles, Doubles, Mixed Doubles, Category-based, or Open tournaments.
* **States:** `DRAFT`, `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
* **Data Fields:** Name, description, date, registration deadline, type, category, participants, bracket, matches, winner, runner-up, status, and tournament bonus configuration.

### 9.2 Bracket Seeding **[v3 — resolves ambiguity]**
* **Default seeding method:** Rating-based seeding — participants are seeded by their `currentRating` at the moment registration closes, using standard bracket seeding (1 vs. lowest seed, 2 vs. second-lowest, etc.) to avoid top players meeting early.
* **Admin override:** Admins may manually adjust bracket placement after auto-seeding (e.g., to separate players from the same household/team, or handle late withdrawals), with the adjustment recorded in the audit log.
* **Random seeding option:** Configurable per-tournament as an alternative to rating-based seeding, for casual/open tournaments where competitive balance matters less.

### 9.3 Tournament Rating Bonus
Tournament rating bonuses are added separately from normal Elo calculations. This ensures tournament achievements are highlighted without distorting day-to-day match rating balances.
* **Default Bonuses:**
  * **Winner:** +50
  * **Runner-up:** +25
  * **Semi-finalist:** +10
* These values must be configurable by administrators inside the database and clearly explained in the UI.

---

## 10. Core Database Schema Design (Mongoose Models)

### 10.1 User Schema
```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['PLAYER', 'ADMIN'], default: 'PLAYER' },
  failedLoginAttempts: { type: Number, default: 0 }, // [v3]
  lockedUntil: { type: Date, default: null },          // [v3]
  createdAt: { type: Date, default: Date.now }
});
```

### 10.2 Player Schema
```javascript
const playerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  playerId: { type: String, unique: true, required: true }, // Format: PH-XXXXX
  name: { type: String, required: true, index: true },
  email: { type: String, required: true, unique: true },
  profilePhoto: { type: String, default: "" },
  currentRating: { type: Number, default: 1000, index: true },
  highestRating: { type: Number, default: 1000 },
  category: { type: String, default: "Intermediate" },
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  winPercentage: { type: Number, default: 0 },
  winningStreak: { type: Number, default: 0 },
  tournamentWins: { type: Number, default: 0 },
  tournamentAppearances: { type: Number, default: 0 },
  accountStatus: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  lastCategoryNotificationAt: { type: Date, default: null }, // [v3] for notification debounce
  createdAt: { type: Date, default: Date.now }
});
```

### 10.3 Match Schema
```javascript
const matchSchema = new mongoose.Schema({
  matchId: { type: String, unique: true, required: true },
  date: { type: Date, default: Date.now },
  court: { type: String, required: true },
  matchType: { type: String, enum: ['SINGLES', 'DOUBLES'], required: true },
  isTournament: { type: Boolean, default: false },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
  teamA: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true }],
  teamB: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true }],
  scores: [{
    teamAScore: { type: Number, required: true },
    teamBScore: { type: Number, required: true }
  }],
  winnerTeam: { type: String, enum: ['A', 'B'], required: true },
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    default: 'PENDING_APPROVAL',
    index: true
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null },
  ratingChanges: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    oldRating: { type: Number },
    newRating: { type: Number },
    delta: { type: Number }
  }],
  recordedByAdmin: { type: Boolean, default: false },
  correction: { // [v3]
    correctedFromMatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
    isSuperseded: { type: Boolean, default: false },
    supersededAt: { type: Date, default: null }
  }
}, { timestamps: true });
```

### 10.4 Rating History Schema
```javascript
const ratingHistorySchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
  oldRating: { type: Number, required: true },
  newRating: { type: Number, required: true },
  delta: { type: Number, required: true },
  changeType: {
    type: String,
    enum: ['MATCH', 'TOURNAMENT_BONUS', 'MANUAL_ADJUSTMENT', 'CORRECTION_REPLAY'], // [v3] added CORRECTION_REPLAY
    required: true
  },
  reason: { type: String, default: "" },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});
```

### 10.5 Court Schema
```javascript
const courtSchema = new mongoose.Schema({
  courtName: { type: String, required: true, unique: true },
  status: { type: String, enum: ['AVAILABLE', 'MAINTENANCE', 'DISABLED'], default: 'AVAILABLE' },
  notes: { type: String, default: "" }
});
```

### 10.6 Audit Log Schema
```javascript
const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g. MATCH_APPROVED, MATCH_RECORDED_DIRECT, RATING_MANUALLY_ADJUSTED, PLAYER_SUSPENDED, MATCH_CORRECTED
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID of the player, match, or tournament changed
  oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
  newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true }
});
```

### 10.7 Counter Schema **[v3 — resolves Player ID concurrency]**
```javascript
const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "playerId"
  value: { type: Number, default: 0 }
});
```
Player IDs are generated using an atomic `findOneAndUpdate` with `$inc` against this counter collection (a standard MongoDB atomic-sequence pattern), guaranteeing uniqueness even under concurrent registrations. Do not generate Player IDs by reading the current max and incrementing in application code — that pattern is race-condition-prone.

---

## 11. System API Structure & Routes

### 11.1 Public & Auth Endpoints (`/api/auth`)
* `POST /api/auth/register` — Create new user account.
* `POST /api/auth/login` — Authenticate and issue JWT.
* `POST /api/auth/logout` — Invalidate user token.

### 11.2 Player Endpoints (`/api/players`)
* `GET /api/players` — Fetch active players list for leaderboard.
* `GET /api/players/:id` — Get detailed player profile & rating graph.
* `GET /api/players/search?query=...` — Search active players (mobile-friendly).
* `GET /api/players/compare?p1=...&p2=...` — Fetch head-to-head performance metrics.

### 11.3 Match Endpoints (`/api/matches`)
* `POST /api/matches/submit` — **[PLAYER ROLE]** Submit a fresh match score. Enters state `PENDING_APPROVAL`. Validated per Section 6.2.
* `GET /api/matches/history` — Fetch historical, approved matches (supports pagination/filters).
* `GET /api/matches/pending` — **[PLAYER]** View matches involving the player currently awaiting admin review.

### 11.4 Admin Endpoints (`/api/admin`)
* `GET /api/admin/matches/pending` — Fetch all matches awaiting verification.
* `POST /api/admin/matches/:id/approve` — Transition match to `APPROVED` and trigger Elo calculations in an atomic transaction.
* `POST /api/admin/matches/:id/reject` — Transition match to `REJECTED` and record reason.
* `POST /api/admin/matches/direct` — Record an official match directly (auto-approved status). **[v3]** Must write an `AuditLog` entry.
* `PUT /api/admin/matches/:id/correct` — Correct a previously approved match. **[v3 — see Section 12.4 for the required cascading replay behavior.]**
* `POST /api/admin/ratings/adjust` — Execute manual rating adjustment with required audit reason.
* `GET /api/admin/audit-logs` — Fetch chronological administrative audit logs.

---

## 12. Transaction Integrity & Concurrency Controls

1. **Atomic Operations:** Use MongoDB Multi-Document Transactions (where supported) to guarantee that Player Rating updates, Match status changes, and Rating History inserts occur as an **all-or-nothing** operation.
2. **Double-Processing Prevention:** Ensure a check is run at the beginning of the approval API call. If `match.status !== 'PENDING_APPROVAL'`, abort instantly to prevent duplicate Elo calculations.
3. **Race Condition Protection:** Enforce optimistic locking or validation checks so a match cannot be approved and processed twice simultaneously.
4. **Match Correction Semantics [v3 — resolves ambiguity]:**
   Correcting an already-`APPROVED` match is **not** an in-place edit of its stored delta. Because every match after it may have used ratings derived from the original (incorrect) outcome, a correction must:
   1. Mark the original match `correction.isSuperseded = true` and stamp `correction.supersededAt`.
   2. Create a new match record referencing the original via `correction.correctedFromMatchId`, with the corrected scores/outcome, status `APPROVED`.
   3. **Trigger a full chronological replay** of Elo calculations for every player affected, starting from the corrected match's original timestamp forward through all of that player's subsequent `APPROVED` matches (in original chronological order), recomputing each one's rating delta as if the correction had been in place from the start. Each replayed step writes a `ratingHistory` entry with `changeType: 'CORRECTION_REPLAY'`.
   4. This replay must run inside a single database transaction per affected player's chain, and must be logged as one `AuditLog` entry summarizing the full scope of the correction (original match, corrected values, list of all matches/players whose ratings were recalculated as a consequence).
   5. **Given the cost of this operation, corrections should be rare and treated as an exceptional admin action**, not routine data entry — the UI should surface a clear warning of the cascading impact before an admin confirms a correction.
   6. **MVP fallback (acceptable simplification):** If full cascading replay is deferred past MVP, the correction may instead only adjust the single match's own delta and leave downstream ratings as-is, **but this must be explicitly disclosed in the admin UI at the time of correction** ("this correction will not retroactively adjust ratings for matches played afterward") and recorded as a known limitation in `MEMORY.md`. Silently doing a partial correction without disclosing the limitation is not acceptable, per the "No Quiet Changes" principle.

---

## 13. Non-Functional Requirements
* **Sub-30-Second Match Recording:** Optimized admin approval and player submission screens with auto-complete player search.
* **Lightweight Payloads:** Clean API design with cursor-based pagination for history.
* **Responsive Layout:** 100% mobile-first design.
* **No Quiet Changes:** Ratings can never be altered without an associated audit log.
* **[v3] Basic Abuse Prevention:** Auth and match-submission endpoints are rate-limited per Section 5.3.

---

## 14. Development Roadmap (12-Week Plan)

* **Sprint 1 — Foundation:** Set up repositories, folder structures, Express boilerplates, and connect MongoDB Atlas.
* **Sprint 2 — Authentication:** Secure JWT registration, login, and role-based route middleware (`PLAYER` vs `ADMIN`). Include login rate-limiting/lockout (Section 5.3).
* **Sprint 3 — Players:** Develop player schema, profile dashboard, unique Player ID assignment (atomic counter, Section 10.7), and category-checking hooks.
* **Sprint 4 — Rating Engine:** Implement Elo calculations, doubles weighted-delta distribution (Section 7.2) or documented MVP fallback, team average helpers, and write unit tests.
* **Sprint 5 — Match Submissions:** Implement player match submission screens and backend validation, including score/winner consistency checks (Section 6.2). Save matches as `PENDING_APPROVAL`.
* **Sprint 6 — Leaderboard:** Build the active sorting leaderboard, search features, suspended-player exclusion (Section 8.3), and display blocks for top-performing players.
* **Sprint 7 — Admin Approvals Queue:** Build review layout. Write backend atomic transaction logic for Approve/Reject/Direct-Entry (all audit-logged), and notification debounce for category crossings.
* **Sprint 8 — Tournaments:** Build bracket generator with rating-based seeding (Section 9.2) and independent configurable tournament rating bonus settings.
* **Sprint 9 — Analytics:** Integrate Recharts for historical Elo tracking graphs, match-win analysis, and comparison pages. Implement match correction with cascading replay or documented fallback (Section 12.4).
* **Sprint 10 — UI Polish:** Responsive design reviews, animations, and empty-state placeholders.
* **Sprint 11 — Testing:** Execute security reviews, test concurrent approvals, correction-replay correctness, and mobile UX validation.
* **Sprint 12 — Deployment:** Final environment variables on Vercel and MongoDB Atlas, live testing, and handover.

---

## 15. AI Agent Development Rules

Any AI coding agent working on this repository must strictly adhere to the following rules:
* **Rule A (Understand before changing):** Inspect repository structure and related files. Understand the current implementation and avoid unnecessary rewrites.
* **Rule B (Preserve working functionality):** Do not break existing features while implementing a new one.
* **Rule C (No fake functionality):** Do not create buttons that appear functional but do nothing.
* **Rule D (No mock data in production flows):** All production flows must connect to the live API and database.
* **Rule E (Centralize business logic):** Keep rating and Elo calculations isolated in the backend rating service. Do not duplicate Elo formulas in React.
* **Rule F (Validate everything):** Validate user inputs, match scores, player selections, and tournament configurations.
* **Rule G (Maintain auditability):** Never silently alter ratings or match results.
* **Rule H (Keep secrets secure):** Never place credentials, JWT secrets, or DB URIs directly in source code.
* **Rule I (Mobile first):** Every page and interface must work flawlessly on mobile.
* **Rule J (Explain decisions):** Update documentation if major architecture changes.
* **Rule K (Use reusable components):** Do not duplicate identical UI logic across pages.
* **Rule L (Use meaningful naming):** Use descriptive names for components, functions, variables, and fields.
* **Rule M (Test critical logic):** Every change to rating logic must be accompanied by comprehensive tests.
* **Rule N (Disclose simplifications) [v3]:** Where this PRD offers an "MVP fallback" simplification (Sections 7.2, 12.4), any agent choosing the fallback must explicitly record that decision in `MEMORY.md`'s Known Issues / Deviations, not implement it silently as if it were the primary spec.

---

## 16. Definition of Done (DoD)
The platform is considered complete and production-ready when:
1. Users can register and secure profiles with starting ratings of `1000`.
2. A player can submit a match, entering a `PENDING_APPROVAL` status.
3. The pending match is completely hidden from Elo updates and the public leaderboard.
4. An administrator can view, approve, or reject this match from an admin-only route.
5. Approving a match correctly updates ratings for all players, shifts player categories, updates metrics, and posts a record to the leaderboard and rating history in a single, atomic operation.
6. Rejecting a match correctly preserves the record with a status of `REJECTED`, stores the reason, and prevents any ratings from updating.
7. Complete audit trails exist for any manual adjustments or match corrections.
8. Submitted scores are validated against the declared winner and rejected if inconsistent (Section 6.2). **[v3]**
9. Player IDs are generated via an atomic counter and are guaranteed unique under concurrent registration. **[v3]**
10. Direct admin match entry produces an audit log entry, identical in spirit to the approval flow. **[v3]**
11. Match correction either performs full cascading rating replay, or — if the MVP fallback is used — clearly discloses the limitation in the UI and logs it as a known deviation. **[v3]**
12. The entire application is deployed to Vercel/MongoDB Atlas and successfully passes end-to-end testing on mobile screens.
