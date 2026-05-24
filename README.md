<div align="center">

# 🤖 AI Code Review Assistant

### Automated, AI-powered pull request reviews — right inside GitHub

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![OpenAI GPT-4o mini](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Live-brightgreen?style=flat-square)]()

<br/>

> **Connect your GitHub account → select any open PR → get an instant, line-by-line AI review with severity scores — in seconds, not days.**

<br/>

<!-- Replace with your actual demo GIF or screenshot once deployed -->
<!-- ![Demo](./docs/demo.gif) -->

[🚀 Live Demo](#) · [📖 Docs](#table-of-contents) · [🐛 Report Bug](https://github.com/PubuduGunasekara/ai-code-reviewer/issues) · [✨ Request Feature](https://github.com/PubuduGunasekara/ai-code-reviewer/issues)

</div>

---

## Table of Contents

- [Why This Project Exists](#-why-this-project-exists)
- [What It Does](#-what-it-does)
- [Who Is It For](#-who-is-it-for)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Features](#-features)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Setup (Without Docker)](#local-setup-without-docker)
  - [Local Setup (With Docker)](#local-setup-with-docker)
- [Environment Variables](#-environment-variables)
- [How to Use It](#-how-to-use-it)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [Author](#-author)

---

## 🧩 Why This Project Exists

Code review is one of the most valuable — and most delayed — parts of the software development lifecycle.

In most engineering teams today:

- Pull requests sit **open for 24–72 hours** waiting for a human reviewer
- Junior developers receive **inconsistent feedback** depending on who reviews their code
- Senior engineers spend **up to 20% of their week** doing code reviews instead of building
- Security vulnerabilities, logic bugs, and style issues slip through simply because reviewers are **overloaded**

GitHub Copilot and similar tools help you *write* code. But what happens after you push?

**AI Code Review Assistant bridges that gap.** It analyzes your PR diff the moment you open it, gives structured, line-by-line feedback using GPT-4o mini, and scores every issue by severity — so your human reviewers walk in already knowing what matters.

This is not just automation. It's a **first-pass expert reviewer available at 3 AM on a Sunday**, for every single PR, for free.

---

## 🎯 What It Does

1. **You log in with GitHub OAuth** — no passwords, no new accounts
2. **You pick any open pull request** from your connected repositories
3. **The app fetches the PR diff** via the GitHub API (Octokit)
4. **GPT-4o mini analyzes every changed file** — logic, security, performance, style
5. **You get a structured review** with inline comments, severity scores (Critical / High / Medium / Low), and suggested fixes
6. **Results are cached in Redis** so re-opening the same PR is instant

---

## 👥 Who Is It For

| Role | Use Case |
|---|---|
| **Solo developers** | Get real code feedback before shipping, without waiting for a teammate |
| **Engineering teams** | Speed up review cycles; AI handles the obvious issues so humans focus on architecture |
| **Junior / bootcamp devs** | Learn from detailed AI feedback on every PR — like having a senior dev always available |
| **Open source maintainers** | First-pass triage of external contributor PRs at scale |
| **CS students** | Get code reviewed on your course projects and personal repos like a professional |

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18 + Vite | Fast, modern SPA with dark/light mode via Tailwind class strategy |
| **Backend** | Node.js + Express | Lightweight, async REST API server |
| **AI Engine** | OpenAI GPT-4o mini | Cost-efficient, high-quality code understanding — ~15× cheaper than GPT-4o with comparable review quality |
| **Auth** | GitHub OAuth 2.0 | Secure, frictionless login tied directly to GitHub identity |
| **GitHub Integration** | Octokit (GitHub REST SDK) | Fetch PRs, diffs, and repository metadata |
| **Database** | PostgreSQL | Persistent storage for user sessions and review history |
| **Caching** | Redis 7 | Rate limiting and review response caching |
| **Containerization** | Docker + Docker Compose | Reproducible local and production environments |
| **CI/CD** | GitHub Actions | Automated lint, test, and deployment pipeline |
| **Hosting** | Railway / AWS EC2 | Zero-sleep cloud deployment |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      User's Browser                      │
│         React 18 + Vite SPA (Light / Dark Mode)         │
└────────────────────────┬────────────────────────────────┘
                         │ REST API calls
                         ▼
┌─────────────────────────────────────────────────────────┐
│               Node.js / Express Backend                  │
│                                                          │
│   ┌──────────────┐    ┌───────────────────────────────┐ │
│   │  Auth Route  │    │       Review Route             │ │
│   │ GitHub OAuth │    │  1. Fetch PR diff (Octokit)    │ │
│   │    2.0       │    │  2. Check Redis cache          │ │
│   └──────┬───────┘    │  3. Call GPT-4o mini API       │ │
│          │            │  4. Parse + score response     │ │
│          │            │  5. Cache result in Redis      │ │
│          │            │  6. Return to client           │ │
│          │            └──────────────┬────────────────┘ │
│          │                           │                   │
└──────────┼───────────────────────────┼───────────────────┘
           │                           │
    ┌──────▼──────┐           ┌────────▼────────┐
    │  PostgreSQL │           │      Redis      │
    │  Sessions & │           │  Rate Limiting  │
    │   History   │           │    & Caching    │
    └─────────────┘           └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │ OpenAI GPT-4o   │
                              │     mini        │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │   GitHub API    │
                              │  via Octokit    │
                              └─────────────────┘
```

**Data Flow for a PR Review:**

```
User selects PR
    → Backend fetches raw diff from GitHub API
    → Check Redis: is this PR already reviewed? (cache hit → return instantly)
    → Cache miss: send diff to GPT-4o mini with structured review prompt
    → Parse GPT-4o mini response into typed review objects (file, line, severity, suggestion)
    → Group findings by category (security, performance, style, logic)
    → Cache result in Redis (TTL: 1 hour)
    → Stream response back to React frontend
    → Frontend renders inline diff view with severity-badged, categorized comments
```

---

## ✨ Features

### Core Functionality
- [x] **GitHub OAuth 2.0** — sign in with your GitHub account, zero friction
- [x] **Repository browser** — see all your connected repos with owner/repo metadata
- [x] **PR fetcher** — list all open pull requests per repository via Octokit
- [x] **AI-powered review engine** — GPT-4o mini analyzes the raw diff and returns structured feedback
- [x] **Severity scoring** — every finding classified as `CRITICAL` · `HIGH` · `MEDIUM` · `LOW`
- [x] **Category grouping** — findings grouped by Security, Performance, Logic, Style for easy scanning
- [x] **Redis caching** — previously reviewed PRs reload instantly; no redundant API calls
- [x] **Rate limiting** — Redis-backed request throttling to protect the OpenAI budget
- [x] **Review history** — all past reviews stored in PostgreSQL, browsable by repo
- [x] **Compact owner/repo badges** — every review card shows repository context at a glance

### UI & Design
- [x] **Light / Dark mode** — persistent theme toggle using Tailwind class-based dark mode
- [x] **Custom logo & favicon** — branded code-check identity
- [x] **Polished component system** — cards, badges, buttons, inputs, loading states, empty states
- [x] **Futuristic design language** — clean, modern aesthetic purpose-built for a technical portfolio
- [x] **Consistent footer** — appears across all main pages with LinkedIn + tech stack chips
- [x] **Responsive layouts** — works on desktop and mobile

### Infrastructure
- [x] **Docker + Docker Compose** — full multi-service stack spins up with one command
- [x] **GitHub Actions CI/CD** — automated lint and build checks on every push
- [x] **Production Vite build** — optimized, tree-shaken frontend bundle
- [x] **ESLint clean** — zero linting errors across frontend and backend

### Planned (Post-MVP)
- [ ] Webhook integration — auto-review every new PR on push, no manual trigger needed
- [ ] GitHub PR comment posting — push AI review back as native GitHub review comments
- [ ] Team analytics dashboard — track code quality score trends over time per repository
- [ ] Custom review rules — per-repo configuration of what GPT-4o mini focuses on
- [ ] GitLab and Bitbucket support

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js 18+](https://nodejs.org/en/download)
- [npm 9+](https://www.npmjs.com/)
- [Docker & Docker Compose](https://docs.docker.com/get-docker/) *(recommended — runs the full stack in one command)*
- A [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) *(free to create)*
- An [OpenAI API key](https://platform.openai.com/api-keys) with GPT-4o mini access

---

### Local Setup (Without Docker)

**1. Clone the repository**

```bash
git clone https://github.com/PubuduGunasekara/ai-code-reviewer.git
cd ai-code-reviewer
```

**2. Install dependencies**

```bash
# Backend
npm install

# Frontend
cd client && npm install && cd ..
```

**3. Configure environment variables**

```bash
cp .env.example .env
# Fill in your values — see the Environment Variables section below
```

**4. Set up the database**

```bash
# Ensure PostgreSQL is running locally, then:
npm run db:migrate
```

**5. Start the development servers**

```bash
# Terminal 1 — Backend (port 5000)
npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

**6. Open the app**

Navigate to [http://localhost:5173](http://localhost:5173)

---

### Local Setup (With Docker)

The recommended approach — one command spins up Node.js, React, PostgreSQL, and Redis together.

**1. Clone and configure**

```bash
git clone https://github.com/PubuduGunasekara/ai-code-reviewer.git
cd ai-code-reviewer
cp .env.example .env
# Fill in your .env values
```

**2. Start all services**

```bash
docker compose up --build
```

This starts:
- `app` — Express backend on port 5000
- `client` — React frontend on port 5173
- `postgres` — PostgreSQL on port 5432
- `redis` — Redis on port 6379

**3. Open the app**

Navigate to [http://localhost:5173](http://localhost:5173)

**Tear down:**

```bash
docker compose down        # Stop containers, keep data
docker compose down -v     # Stop containers and wipe all volumes
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root. **Never commit this file** — it's already in `.gitignore`.

```env
# ── Server ──────────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ── GitHub OAuth App ─────────────────────────────────────
# Create one at: https://github.com/settings/developers
# Callback URL: http://localhost:5000/auth/github/callback
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# ── OpenAI ───────────────────────────────────────────────
# Get your key at: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# ── PostgreSQL ───────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_reviewer

# ── Redis ────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Session ──────────────────────────────────────────────
SESSION_SECRET=replace_with_a_long_random_string
```

### How to get each credential

| Variable | Where to get it |
|---|---|
| `GITHUB_CLIENT_ID` / `SECRET` | [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `SESSION_SECRET` | Run `openssl rand -hex 32` in your terminal |

---

## 📖 How to Use It

**Step 1 — Log in with GitHub**

Click "Sign in with GitHub" and authorize the app. This grants read access to your repositories and pull requests.

**Step 2 — Select a repository**

Browse your connected repositories. Each card shows the owner, repo name, and metadata at a glance.

**Step 3 — Pick an open PR**

Select a pull request from the list. The app shows the PR title, author, file count, and age.

**Step 4 — Run the AI review**

Click "Review PR". The app fetches the diff and sends it to GPT-4o mini. Reviews complete in 5–15 seconds depending on PR size.

**Step 5 — Read the results**

The review detail page shows findings organized by severity and category. Each finding includes:
- 📍 **File and line number**
- 🚦 **Severity badge**: `CRITICAL` · `HIGH` · `MEDIUM` · `LOW`
- 🏷 **Category**: Security · Performance · Logic · Style
- 💬 **Explanation** of the issue
- 🔧 **Suggested fix** (code snippet where applicable)

**Step 6 — Revisit anytime**

Previously reviewed PRs reload instantly from Redis cache. Full review history is grouped by repository in the dashboard.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/auth/github` | Redirect to GitHub OAuth login |
| `GET` | `/auth/github/callback` | OAuth callback — sets session cookie |
| `DELETE` | `/auth/logout` | Clear session and log out |
| `GET` | `/api/repos` | List authenticated user's repositories |
| `GET` | `/api/repos/:owner/:repo/pulls` | List open PRs for a repository |
| `GET` | `/api/review/:owner/:repo/:pull_number` | Fetch or generate AI review for a PR |
| `GET` | `/api/history` | List all past reviews, grouped by owner/repo |

---

## 🤝 Contributing

Contributions are welcome!

```bash
# 1. Fork the repo on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/ai-code-reviewer.git

# 3. Create a feature branch
git checkout -b feature/your-feature-name

# 4. Commit your changes
git commit -m "feat: describe your change"

# 5. Push and open a PR
git push origin feature/your-feature-name
```

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 👤 Author

**Pubudu Gunasekara**  
MS Computer Science @Northeastern University

[![GitHub](https://img.shields.io/badge/GitHub-PubuduGunasekara-181717?style=flat-square&logo=github)](https://github.com/PubuduGunasekara)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/pubudu-gunasekara)

---

<div align="center">

Built by Pubudu Gunasekara · MIT License

*If this helped you or you found it interesting, drop a ⭐ on GitHub!*

</div>
