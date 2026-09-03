# The PickleHub

A competitive sports-tech platform for pickleball player management, Elo-style ratings, match tracking, and tournament management.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, Tailwind CSS, React Router, Recharts |
| **Backend** | Node.js, Express.js, Mongoose, REST API |
| **Database** | MongoDB Atlas (M0 Free Cluster) |
| **Auth** | JWT, bcrypt |
| **Hosting** | Vercel (frontend + serverless backend) |

## Project Structure

```
picklehub/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/          # Express.js backend
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.js
│   └── package.json
├── docs/            # PRD, design system, milestones, memory
├── .env.example     # Environment variable template
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas M0 cluster (or local MongoDB)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd picklehub
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI, JWT secret, etc.
   ```

3. **Install & run the server**
   ```bash
   cd server
   npm install
   npm run dev
   ```

4. **Install & run the client** (in a separate terminal)
   ```bash
   cd client
   npm install
   npm run dev
   ```

5. **Verify** — Visit `http://localhost:5173` (client) and `http://localhost:5000/api/health` (server).

## Core Concept

```
PLAY → RECORD/SUBMIT → ADMIN APPROVAL → GET RATED → IMPROVE → CLIMB → COMPETE
```

Only matches officially recorded and approved at The PickleHub contribute to the official PickleHub Rating. See [`docs/prd-v3.md`](docs/prd-v3.md) for full product requirements.
