# Stock Alert Application

A real-time stock price monitoring and alert system built with Python FastAPI and React.

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   React     │────────▶│   FastAPI    │────────▶│   Stock     │
│   Frontend  │◀────────│   Backend    │◀────────│   API       │
│             │         │              │         │ (Finnhub)   │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              │
                        ┌─────▼──────┐
                        │ PostgreSQL │
                        │  Database  │
                        └────────────┘
                              │
                        ┌─────▼──────┐
                        │ Background │
                        │   Worker   │
                        │ (Alerts)   │
                        └────────────┘
```

## 🚀 Features

- **Real-time Stock Data**: WebSocket connections for live price updates
- **Custom Alerts**: Set price thresholds, percentage changes, or custom conditions
- **Multi-channel Notifications**: Email, SMS, or in-app notifications
- **Watchlists**: Track multiple stocks simultaneously
- **Historical Data**: View price charts and historical trends
- **User Authentication**: Secure JWT-based authentication

## 📋 Prerequisites

- Python 3.9+
- Node.js 16+
- PostgreSQL 13+
- Docker & Docker Compose (optional)

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework
- **SQLAlchemy**: ORM for database operations
- **Alembic**: Database migrations
- **Celery**: Background task processing
- **Redis**: Message broker for Celery
- **WebSockets**: Real-time communication

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Recharts**: Data visualization
- **Tailwind CSS**: Styling
- **Axios**: HTTP client

### Infrastructure
- **PostgreSQL**: Primary database
- **Redis**: Caching and message broker
- **Docker**: Containerization
- **Nginx**: Reverse proxy (production)

## 📁 Project Structure

```
stock-alert-app/
├── backend/
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── stocks.py
│   │   │   ├── alerts.py
│   │   │   └── websocket.py
│   │   ├── core/             # Core configuration
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/           # Database models
│   │   │   ├── user.py
│   │   │   ├── alert.py
│   │   │   └── watchlist.py
│   │   ├── services/         # Business logic
│   │   │   ├── stock_api.py
│   │   │   ├── alert_engine.py
│   │   │   └── notification.py
│   │   ├── tasks/            # Background tasks
│   │   │   └── alert_checker.py
│   │   └── main.py           # Application entry point
│   ├── tests/
│   ├── alembic/              # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd stock-alert-app

# Copy environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your settings

# Run database migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your settings

# Start the development server
npm start
```

## 🔑 Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/stockalert

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stock API (Choose one)
FINNHUB_API_KEY=your-finnhub-key
# ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
# POLYGON_API_KEY=your-polygon-key

# Redis
REDIS_URL=redis://localhost:6379/0

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Twilio (for SMS notifications - optional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-twilio-number
```

### Frontend (.env.local)

```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws
```

## 📊 Stock API Setup

This project supports multiple stock data providers. Choose one:

### Finnhub (Recommended for beginners)

1. Sign up at [https://finnhub.io](https://finnhub.io)
2. Get your free API key
3. Add to `.env`: `FINNHUB_API_KEY=your-key`
4. Free tier: 60 API calls/minute

### Alpha Vantage

1. Sign up at [https://www.alphavantage.co](https://www.alphavantage.co)
2. Get your free API key
3. Add to `.env`: `ALPHA_VANTAGE_API_KEY=your-key`
4. Free tier: 5 API calls/minute, 500/day

### Polygon.io

1. Sign up at [https://polygon.io](https://polygon.io)
2. Get your API key
3. Add to `.env`: `POLYGON_API_KEY=your-key`
4. Free tier: Limited real-time data

## 👥 Team Collaboration

### Git Workflow

We use **Git Flow** for branch management:

```bash
# Main branches
main              # Production-ready code
develop           # Integration branch for features

# Feature branches
feature/auth      # Authentication feature
feature/alerts    # Alert system
feature/charts    # Chart visualization

# Release branches
release/v1.0.0    # Preparing for release

# Hotfix branches
hotfix/login-bug  # Critical production fixes
```

### Development Workflow

1. **Pick a task** from GitHub Issues or your project board
2. **Create a feature branch**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and commit regularly:
   ```bash
   git add .
   git commit -m "feat: add stock price alert creation"
   ```

4. **Push and create Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a PR on GitHub from your feature branch to `develop`

5. **Code Review**: Wait for team review and approval
6. **Merge**: Once approved, merge into `develop`

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons, etc.
refactor: code restructuring
test: adding tests
chore: updating build tasks, package manager configs, etc.
```

Examples:
```bash
git commit -m "feat: add WebSocket connection for real-time prices"
git commit -m "fix: resolve alert trigger timing issue"
git commit -m "docs: update API endpoint documentation"
```

### Code Review Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No console.log or debugging code
- [ ] Environment variables not hardcoded
- [ ] Error handling implemented

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
pytest --cov=app tests/  # With coverage
```

### Frontend Tests

```bash
cd frontend
npm test
npm test -- --coverage
```

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

```
POST   /api/auth/register      # Register new user
POST   /api/auth/login         # Login
GET    /api/stocks/{symbol}    # Get stock data
POST   /api/alerts             # Create alert
GET    /api/alerts             # List user alerts
WS     /ws/stocks              # WebSocket for real-time data
```

## 🚀 Deployment

### Docker Compose (Simple)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Platforms

- **Backend**: Railway, Render, AWS ECS, Google Cloud Run
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Database**: Railway, Render, AWS RDS, Supabase

## 🐛 Troubleshooting

### Database connection issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres
```

### API rate limits
```bash
# Check your API usage in logs
docker-compose logs backend | grep "rate limit"
```

### WebSocket connection fails
- Ensure backend is running
- Check CORS settings in `backend/app/core/config.py`
- Verify WebSocket URL in frontend `.env.local`

## 📖 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [Finnhub API Docs](https://finnhub.io/docs/api)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - feel free to use this project for learning and portfolio purposes

## 👥 Team Members

- Developer 1: Backend & API
- Developer 2: Frontend & UI/UX
- Developer 3: Alert System & Notifications
- (Add your team members here)

## 🎯 Project Milestones

- [ ] Week 1: Backend API & Database Setup
- [ ] Week 2: Real-time Stock Data Integration
- [ ] Week 3: Alert System Implementation
- [ ] Week 4: Frontend Development
- [ ] Week 5: Testing & Bug Fixes
- [ ] Week 6: Deployment & Documentation

## 📧 Contact

For questions or suggestions, open an issue or contact the team.
