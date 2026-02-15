# Quick Start Guide

## Prerequisites

Make sure you have installed:
- Docker & Docker Compose
- Python 3.9+ (for local development)
- Node.js 16+ (for frontend development)

## Setup Steps

### 1. Get Stock API Key

Choose one of these providers and get a free API key:

**Option A: Finnhub (Recommended)**
1. Visit https://finnhub.io
2. Sign up for a free account
3. Copy your API key from the dashboard

**Option B: Alpha Vantage**
1. Visit https://www.alphavantage.co/support/#api-key
2. Get your free API key
3. Note: Limited to 5 calls/minute

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file
nano .env
```

**Required configuration:**
```bash
# Add your stock API key
FINNHUB_API_KEY=your_api_key_here

# Generate a secure secret key (or use the default for testing)
SECRET_KEY=$(openssl rand -hex 32)
```

### 3. Start with Docker (Easiest)

```bash
# Start all services
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f
```

Services will be available at:
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Frontend: http://localhost:3000 (to be added)

### 4. Create Your First User

**Option A: Using API Docs**
1. Open http://localhost:8000/docs
2. Find the `/api/v1/auth/register` endpoint
3. Click "Try it out"
4. Enter your details:
   ```json
   {
     "username": "testuser",
     "email": "test@example.com",
     "password": "securepassword123"
   }
   ```
5. Click "Execute"

**Option B: Using curl**
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "securepassword123"
  }'
```

### 5. Login and Get Token

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=securepassword123"
```

Save the `access_token` from the response.

### 6. Test the API

```bash
# Set your token
TOKEN="your_access_token_here"

# Get a stock quote
curl -X GET "http://localhost:8000/api/v1/stocks/quote/AAPL" \
  -H "Authorization: Bearer $TOKEN"

# Create an alert
curl -X POST "http://localhost:8000/api/v1/alerts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "alert_type": "price_above",
    "threshold_value": 150.0,
    "is_repeating": false
  }'

# List your alerts
curl -X GET "http://localhost:8000/api/v1/alerts" \
  -H "Authorization: Bearer $TOKEN"
```

## Local Development (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up PostgreSQL
# Install PostgreSQL and create database:
createdb stockalert

# Run migrations (when implemented)
# alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

## Troubleshooting

### Docker Issues

**Containers not starting:**
```bash
# Check logs
docker-compose logs backend
docker-compose logs postgres

# Restart services
docker-compose restart
```

**Database connection errors:**
```bash
# Ensure PostgreSQL is healthy
docker-compose ps

# Restart database
docker-compose restart postgres
```

### API Issues

**"Invalid API key" errors:**
- Check that your API key is correctly set in `.env`
- Verify the key works by testing it directly on the provider's website

**Rate limit errors:**
- Free tiers have limits (Finnhub: 60/min, Alpha Vantage: 5/min)
- Wait a minute before trying again
- Consider upgrading your API plan

### Port Conflicts

If ports 8000, 5432, or 6379 are already in use:

```bash
# Edit docker-compose.yml and change ports
# For example, change "8000:8000" to "8001:8000"
```

## Next Steps

1. **Explore the API**: Visit http://localhost:8000/docs
2. **Create alerts**: Set up price alerts for your favorite stocks
3. **Test WebSocket**: Connect to ws://localhost:8000/ws/stocks
4. **Build frontend**: Customize the React frontend
5. **Deploy**: Follow deployment guide for production

## Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Rebuild after code changes
docker-compose up -d --build

# Reset database
docker-compose down -v
docker-compose up -d
```

## Need Help?

1. Check the main README.md for detailed documentation
2. Review API documentation at http://localhost:8000/docs
3. Check Docker logs: `docker-compose logs`
4. Open an issue on GitHub
