# Cortex — Intelligent Market Analytics

A full-stack stock monitoring platform with real-time quotes, price alerts, sector-based tracking, and market index monitoring. Built with FastAPI, React/TypeScript, PostgreSQL, Redis, and Docker.

## Architecture

```
Frontend (React + Vite)        Backend (FastAPI)          External
┌─────────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Tailwind + Framer   │────▶│  REST API        │────▶│  Finnhub API │
│  Motion UI           │◀────│  JWT Auth        │◀────│  (Real-time) │
└─────────────────────┘     └──────────────────┘     └──────────────┘
                                   │
                            ┌──────┴──────┐
                            │             │
                       ┌────▼───┐   ┌─────▼────┐
                       │Postgres│   │  Redis    │
                       │  DB    │   │  Cache    │
                       └────────┘   └──────────┘
                            │
                       ┌────▼────────┐
                       │Alert Checker│
                       │  (Worker)   │
                       └─────────────┘
```

## Features

- **Real-time Stock Quotes** — Search any stock and get live price data via Finnhub
- **Price Alerts** — Set alerts for price above/below, percent change, or volume spikes
- **Sector Tracking** — Group stocks by custom sectors (e.g. Security, SaaS, AI) with live prices
- **Market Indexes** — SPY, QQQ, IWM prices in the navbar, auto-refreshing every 30s
- **Background Alert Checker** — Worker polls every 60s and triggers alerts when conditions are met
- **Modern UI** — Dark glassmorphism design with Framer Motion animations
- **JWT Authentication** — Secure login/register with token-based auth

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A free [Finnhub API key](https://finnhub.io/) (60 calls/min on free tier)

### 1. Clone and configure

```bash
git clone https://github.com/prasanthpriyanesan/cortex.git
cd cortex
cp .env.example .env
```

Edit `.env` and add your Finnhub API key:

```
FINNHUB_API_KEY=your_key_here
```

### 2. Start everything

```bash
docker compose up -d --build -V
```

This spins up 6 containers:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React app (Vite dev server) |
| Backend API | http://localhost:8000 | FastAPI with auto-docs |
| API Docs | http://localhost:8000/docs | Swagger UI |
| Adminer | http://localhost:8080 | Database viewer |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |

### 3. Create an account

Open http://localhost:3000, click "Register", and create your account. You're in!

## Project Structure

```
cortex/
├── backend/
│   ├── app/
│   │   ├── api/                # API endpoints
│   │   │   ├── auth.py         # Login / Register
│   │   │   ├── stocks.py       # Quotes, search, indexes
│   │   │   ├── alerts.py       # CRUD alerts
│   │   │   ├── sectors.py      # Sector management
│   │   │   └── websocket.py    # WebSocket handler
│   │   ├── core/               # Config, DB, security
│   │   ├── models/             # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── alert.py
│   │   │   ├── sector.py
│   │   │   └── watchlist.py
│   │   ├── services/           # Business logic
│   │   │   ├── stock_api.py    # Finnhub client
│   │   │   ├── alert_engine.py # Alert evaluation
│   │   │   └── notification.py # Email/SMS
│   │   ├── tasks/
│   │   │   └── alert_checker.py # Background worker
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/AuthPage.tsx
│   │   │   ├── Layout/Navbar.tsx
│   │   │   ├── Layout/Sidebar.tsx
│   │   │   └── Dashboard/
│   │   │       ├── StockSearch.tsx
│   │   │       ├── StockCard.tsx
│   │   │       ├── AlertList.tsx
│   │   │       ├── CreateAlertModal.tsx
│   │   │       ├── StatsOverview.tsx
│   │   │       ├── SectorsPage.tsx
│   │   │       └── SectorWidget.tsx
│   │   ├── services/api.ts     # Axios API client
│   │   ├── App.tsx
│   │   └── index.css           # Tailwind + custom styles
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── .gitignore
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons |
| Backend | Python 3.11, FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Auth | JWT (OAuth2 password bearer) |
| Stock Data | Finnhub API |
| DevOps | Docker Compose, Hot reload on both frontend and backend |

## API Endpoints

```
Auth
  POST  /api/v1/auth/register     Register new user
  POST  /api/v1/auth/login        Login (returns JWT)
  GET   /api/v1/auth/me           Current user info

Stocks
  GET   /api/v1/stocks/quote/{symbol}       Real-time quote
  GET   /api/v1/stocks/profile/{symbol}     Company profile
  GET   /api/v1/stocks/search?q=            Search stocks
  GET   /api/v1/stocks/indexes              Market indexes (SPY/QQQ/IWM)
  GET   /api/v1/stocks/historical/{symbol}  Historical data

Alerts
  POST  /api/v1/alerts             Create alert
  GET   /api/v1/alerts             List user alerts
  GET   /api/v1/alerts/{id}        Get alert detail
  PUT   /api/v1/alerts/{id}        Update alert
  DELETE /api/v1/alerts/{id}       Delete alert

Sectors
  POST  /api/v1/sectors                      Create sector
  GET   /api/v1/sectors                      List user sectors
  PUT   /api/v1/sectors/{id}                 Update sector
  DELETE /api/v1/sectors/{id}                Delete sector
  POST  /api/v1/sectors/{id}/stocks          Add stock to sector
  DELETE /api/v1/sectors/{id}/stocks/{symbol} Remove stock from sector
```

## Auto-Polling Intervals

| What | Interval | Location |
|------|----------|----------|
| Market Indexes (SPY/QQQ/IWM) | 30s | Navbar |
| Sector stock prices | 30s | Dashboard & Sectors page |
| Alert checker (backend) | 60s | Background worker |
| Stock quotes | Manual | On search/click |

## Database Access

**Via Adminer (web UI):** http://localhost:8080
- System: PostgreSQL
- Server: `postgres`
- Username: `stockalert`
- Password: `stockalert123`
- Database: `stockalert`

**Via CLI:**
```bash
docker exec stockalert_db psql -U stockalert -d stockalert -c "SELECT * FROM users;"
```

## Development

Both frontend and backend have **hot reload** enabled via Docker volume mounts. Just edit files and save — changes appear instantly.

### Useful commands

```bash
# Start all services
docker compose up -d --build -V

# View logs
docker compose logs -f frontend
docker compose logs -f backend

# Restart a single service
docker restart stockalert_frontend

# Stop everything
docker compose down

# Stop and remove volumes (fresh DB)
docker compose down -v
```

## Collaboration

### Branch workflow

```bash
git checkout -b feature/your-feature
# make changes
git add -A
git commit -m "feat: description of change"
git push -u origin feature/your-feature
# open PR on GitHub
```

### Commit conventions

```
feat:     new feature
fix:      bug fix
refactor: code restructuring
docs:     documentation
style:    formatting
```

## Troubleshooting

**Finnhub rate limit (429 errors):** Free tier allows 60 calls/min. If you have many sector stocks, prices may load slowly. Reduce polling or upgrade your API plan.

**Frontend CSS errors:** If Tailwind classes aren't working, restart the frontend container: `docker restart stockalert_frontend`

**Database connection issues:** Check postgres is healthy: `docker compose ps`

**Stale node_modules:** Use the `-V` flag to recreate anonymous volumes: `docker compose up -d --build -V`

## License

MIT
