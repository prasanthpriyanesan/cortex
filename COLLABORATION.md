# Team Collaboration Guide

## Getting Started as a Team Member

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd stock-alert-app

# Copy environment file
cp .env.example .env

# Get your API keys
# Each team member should get their own Finnhub API key from https://finnhub.io
# Add it to your local .env file

# Start the services
docker-compose up -d
```

### 2. Development Workflow

#### Creating a Feature Branch

```bash
# Always start from develop
git checkout develop
git pull origin develop

# Create your feature branch
git checkout -b feature/your-feature-name

# Examples:
# git checkout -b feature/email-notifications
# git checkout -b feature/price-charts
# git checkout -b fix/alert-trigger-bug
```

#### Making Changes

```bash
# Make your changes
# ... edit files ...

# Check what changed
git status
git diff

# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add email notification service"

# Push to remote
git push origin feature/your-feature-name
```

#### Creating a Pull Request

1. Go to GitHub/GitLab
2. Click "New Pull Request"
3. Base: `develop` ← Compare: `feature/your-feature-name`
4. Fill in the PR template:
   ```markdown
   ## Description
   Brief description of what this PR does
   
   ## Changes
   - Added email notification service
   - Updated alert model to track notification status
   
   ## Testing
   - Tested with Gmail SMTP
   - Verified alerts trigger emails
   
   ## Screenshots (if applicable)
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Tests added/updated
   - [ ] Documentation updated
   ```

5. Request review from team members
6. Address review comments
7. Once approved, merge into `develop`

### 3. Team Communication

#### Daily Standup (Async)

Post in your team chat:
```
Yesterday: Implemented alert checker background task
Today: Working on email notification integration
Blockers: Need SMTP credentials for testing
```

#### Code Review Guidelines

**As a Reviewer:**
- Be constructive and respectful
- Ask questions rather than making demands
- Praise good code
- Test the changes locally if possible

**Example Comments:**
```
✅ Good: "Nice work on the error handling! Have you considered adding 
  logging here for debugging?"

❌ Bad: "This is wrong. Use try-catch."
```

**As an Author:**
- Don't take feedback personally
- Ask for clarification if needed
- Update your PR based on feedback
- Thank reviewers

### 4. Task Management

We use GitHub Issues/Projects for task tracking:

#### Creating an Issue

```markdown
Title: Add SMS notification support

Labels: enhancement, backend

Description:
**User Story**
As a user, I want to receive SMS alerts so that I can be notified on my phone.

**Acceptance Criteria**
- [ ] Integrate Twilio API
- [ ] Add phone number field to user model
- [ ] Add SMS option when creating alerts
- [ ] Test with real phone number

**Technical Notes**
- Use existing notification service pattern
- Add Twilio credentials to .env
- Update user preferences API
```

#### Claiming a Task

1. Comment on the issue: "I'll work on this"
2. Assign yourself
3. Create a feature branch
4. Link PR to issue when ready

### 5. Code Standards

#### Python (Backend)

```python
# Use type hints
def get_stock_quote(symbol: str) -> Optional[Dict]:
    """
    Get real-time quote for a stock.
    
    Args:
        symbol: Stock ticker symbol
        
    Returns:
        Quote data or None if not found
    """
    pass

# Use meaningful variable names
user_alert_count = db.query(Alert).filter(...).count()  # Good
x = db.query(Alert).filter(...).count()  # Bad

# Handle errors gracefully
try:
    result = await api.get_quote(symbol)
except Exception as e:
    logger.error(f"Failed to fetch quote for {symbol}: {e}")
    return None
```

#### TypeScript (Frontend)

```typescript
// Use interfaces
interface StockQuote {
  symbol: string;
  current_price: number;
  percent_change: number;
}

// Use async/await
const fetchQuote = async (symbol: string): Promise<StockQuote> => {
  const response = await stocksAPI.getQuote(symbol);
  return response.data;
};

// Use descriptive function names
const handleCreateAlert = () => { ... }  // Good
const onClick = () => { ... }  // Bad
```

#### Commit Messages

Follow the conventional commits format:

```bash
feat: add email notification service
fix: resolve alert trigger timing issue
docs: update API endpoint documentation
style: format code with Black
refactor: simplify alert checking logic
test: add tests for stock API service
chore: update dependencies
```

### 6. Testing Your Changes

#### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run specific test file
pytest tests/test_alerts.py

# Run with coverage
pytest --cov=app tests/
```

#### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

#### Manual Testing

Always test your changes manually:

1. Start services: `docker-compose up -d`
2. Test the API endpoint in Swagger: http://localhost:8000/docs
3. Test the frontend feature
4. Check logs for errors: `docker-compose logs -f`

### 7. Common Scenarios

#### Scenario: Merge Conflicts

```bash
# Update your branch with latest develop
git checkout develop
git pull origin develop
git checkout feature/your-feature
git merge develop

# If conflicts occur:
# 1. Open conflicted files
# 2. Resolve conflicts manually
# 3. Remove conflict markers (<<<<, ====, >>>>)
# 4. Test that everything works
# 5. Commit the resolution

git add .
git commit -m "merge: resolve conflicts with develop"
git push origin feature/your-feature
```

#### Scenario: Need to Update PR

```bash
# Make changes based on review
# ... edit files ...

git add .
git commit -m "refactor: address review comments"
git push origin feature/your-feature

# The PR will automatically update
```

#### Scenario: Accidentally Committed to Wrong Branch

```bash
# If you committed to develop instead of feature branch
git checkout develop
git log  # Note the commit hash

git reset --hard HEAD~1  # Undo the commit
git checkout -b feature/my-feature  # Create correct branch
git cherry-pick <commit-hash>  # Apply the commit here
```

### 8. Pair Programming

#### When to Pair

- Complex features
- Debugging difficult issues
- Onboarding new team members
- Learning new technologies

#### How to Pair Remotely

1. **Screen Sharing**: VS Code Live Share, Zoom, Discord
2. **Role Rotation**: Switch driver/navigator every 25 minutes
3. **Communication**: Talk through your thought process

### 9. Team Meetings

#### Weekly Planning (1 hour)

- Review completed tasks
- Plan next week's tasks
- Assign responsibilities
- Discuss blockers

#### Code Review Sessions (30 min)

- Review complex PRs together
- Discuss architectural decisions
- Share learnings

### 10. Getting Help

#### Where to Ask

1. **Quick questions**: Team chat
2. **Technical issues**: GitHub Discussions
3. **Bugs**: Create an issue
4. **Blockers**: Mention in standup

#### How to Ask

**Good Question:**
```
I'm trying to implement WebSocket subscriptions, but getting a 
connection error. I've checked:
- Backend is running (port 8000)
- WebSocket URL is correct
- CORS is configured

Error: "WebSocket connection failed"

Here's my code: [link to code]
Anyone faced this before?
```

**Bad Question:**
```
WebSocket doesn't work. Help!
```

### 11. Project Conventions

#### File Naming

```
backend/app/api/alerts.py          # lowercase, underscores
frontend/src/components/AlertCard.tsx  # PascalCase for components
```

#### API Endpoints

```
POST   /api/v1/alerts          # Create
GET    /api/v1/alerts          # List
GET    /api/v1/alerts/{id}     # Get one
PUT    /api/v1/alerts/{id}     # Update
DELETE /api/v1/alerts/{id}     # Delete
```

#### Database Migrations

```bash
# Create migration
cd backend
alembic revision --autogenerate -m "add phone number to user"

# Apply migration
alembic upgrade head

# Commit the migration file
git add alembic/versions/xxx_add_phone_number.py
git commit -m "chore: add phone number migration"
```

## Quick Reference

```bash
# Start working
git checkout develop
git pull
git checkout -b feature/my-feature

# Save work
git add .
git commit -m "feat: description"
git push origin feature/my-feature

# Update from develop
git checkout develop && git pull
git checkout feature/my-feature
git merge develop

# View changes
git status
git diff
git log --oneline

# Docker commands
docker-compose up -d        # Start
docker-compose logs -f      # View logs
docker-compose restart      # Restart
docker-compose down         # Stop
```

## Team Culture

- **Be respectful**: Everyone is learning
- **Be responsive**: Reply to PRs within 24 hours
- **Be helpful**: Share knowledge and resources
- **Be open**: Ask questions, admit when you don't know
- **Celebrate wins**: Recognize team achievements

Welcome to the team! 🚀
