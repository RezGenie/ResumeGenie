# 🧪 RezGenie Testing Guide

**Comprehensive testing procedures for frontend routes and API endpoints**

## 🎯 Testing Overview

This guide covers:
- **Frontend Route Testing**: All 15+ pages and user flows
- **API Endpoint Testing**: Backend REST API validation
- **Integration Testing**: Full-stack functionality
- **Performance Testing**: Load and response times

---

## 🌐 Frontend Route Testing

### Prerequisites
```bash
# Ensure frontend is running
cd frontend
npm run dev
# Should be available at http://localhost:3000 or 3001
```

### 1. Public Routes (No Authentication Required)

#### Landing Page
```bash
URL: http://localhost:3000/
Tests:
✅ Page loads without errors
✅ Hero section displays correctly  
✅ Features section is visible
✅ Navigation menu works
✅ Theme toggle (dark/light) functions
✅ Responsive design on mobile/tablet/desktop
```

#### Authentication Page
```bash
URL: http://localhost:3000/auth
Tests:
✅ Login form validates email format
✅ Password field shows/hides correctly
✅ Registration form creates new accounts
✅ Form validation messages appear
✅ Tab switching between login/register works
```

#### Legal Pages
```bash
URLs:
- http://localhost:3000/privacy
- http://localhost:3000/terms
- http://localhost:3000/contact

Tests:
✅ Content loads and formats correctly
✅ Navigation breadcrumbs work
✅ Contact form submits (frontend validation)
✅ Team member cards display properly
```

#### Pricing Page
```bash
URL: http://localhost:3000/pricing
Tests:
✅ Pricing tiers display correctly
✅ Feature comparison table works
✅ CTA buttons are functional
✅ Responsive pricing cards
```

### 2. Protected Routes (Authentication Required)

#### Dashboard
```bash
URL: http://localhost:3000/dashboard
Tests:
✅ Redirects to /auth if not logged in
✅ Welcome message displays user info
✅ Stats cards show placeholder data
✅ Recent activity section loads
✅ Quick action buttons are clickable
```

#### AI Genie
```bash
URL: http://localhost:3000/genie
Tests:  
✅ Drag-and-drop area appears
✅ File upload validation works
✅ Job posting textarea accepts input
✅ Analysis button triggers correctly
✅ Progress indicators function
✅ Results display area is ready
```

#### Job Opportunities
```bash
URL: http://localhost:3000/opportunities
Tests:
✅ Job listing cards display
✅ Filter controls work
✅ Search functionality active
✅ Pagination controls function
✅ Match percentage displays
```

#### User Profile
```bash
URL: http://localhost:3000/profile
Tests:
✅ User information form loads
✅ Profile picture upload area
✅ Settings toggles function
✅ Save button triggers validation
✅ Account management options
```

### 3. Career Guides Section

#### Guides Hub
```bash
URL: http://localhost:3000/guides
Tests:
✅ Guide cards display with proper styling
✅ Navigation to individual guides works
✅ Search/filter functionality
✅ Responsive card layout
```

#### Individual Guide Pages
```bash
URLs:
- http://localhost:3000/guides/optimizing-resume
- http://localhost:3000/guides/genie-wishes  
- http://localhost:3000/guides/get-more-interviews

Tests:
✅ Guide content displays correctly
✅ Navigation between sections works
✅ Code examples are formatted
✅ Back to guides navigation
```

### 4. Error Handling

#### 404 Page
```bash
URL: http://localhost:3000/nonexistent-page
Tests:
✅ Custom 404 page displays
✅ Navigation options provided
✅ Consistent styling with app
```

---

## 🔌 API Endpoint Testing

### Prerequisites
```bash
# Ensure backend is running
cd backend
conda activate rezgenie
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Should be available at http://localhost:8000
```

### 1. Health Check Endpoints

#### Basic Health Check
```bash
curl -X GET http://localhost:8000/health
# Expected: {"status": "healthy", "timestamp": "..."}
```

#### Detailed Health Check
```bash
curl -X GET http://localhost:8000/api/v1/health
# Expected: Detailed service status including database, redis, etc.
```

### 2. Authentication Endpoints

#### User Registration
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!"
  }'
  
# Expected: 201 Created with user object
# Test variations:
# - Invalid email format
# - Weak password
# - Duplicate email
```

#### User Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!"
  }'
  
# Expected: 200 OK with JWT token
# Save token for protected endpoint tests
```

#### Token Validation
```bash
# Get token from login response, then:
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
  
# Expected: User profile information
```

### 3. Resume Management Endpoints

#### Upload Resume
```bash
curl -X POST http://localhost:8000/api/v1/resumes/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/sample-resume.pdf"
  
# Expected: 201 Created with resume metadata
# Test with different file types: .pdf, .docx
```

#### List User Resumes
```bash
curl -X GET http://localhost:8000/api/v1/resumes/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
  
# Expected: Array of user's uploaded resumes
```

#### Get Resume Details
```bash
curl -X GET http://localhost:8000/api/v1/resumes/{resume_id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
  
# Expected: Detailed resume information including extracted text
```

#### Delete Resume
```bash
curl -X DELETE http://localhost:8000/api/v1/resumes/{resume_id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
  
# Expected: 204 No Content
```

### 4. Job Analysis Endpoints

#### Analyze Job Posting
```bash
curl -X POST http://localhost:8000/api/v1/jobs/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resume_id": "uuid-of-uploaded-resume",
    "job_title": "Senior Software Engineer",
    "company_name": "Tech Corp",
    "job_description": "We are looking for a Senior Software Engineer with experience in Python, FastAPI, and React..."
  }'
  
# Expected: Job analysis results with similarity scores
```

#### Get Job Comparisons
```bash
curl -X GET http://localhost:8000/api/v1/jobs/comparisons \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
  
# Expected: Array of previous job comparisons
```

### 5. Genie Wishes Endpoints

#### Create Genie Wish
```bash
curl -X POST http://localhost:8000/api/v1/genie/wishes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wish_type": "resume_improvement",
    "request_text": "Please help me improve my resume for software engineering roles"
  }'
  
# Expected: 201 Created with wish ID
```

#### Get Wish Status
```bash
curl -X GET http://localhost:8000/api/v1/genie/wishes/{wish_id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
  
# Expected: Wish status and response (if completed)
```

### 6. Analytics Endpoints

#### Get Dashboard Analytics
```bash
curl -X GET http://localhost:8000/api/v1/analytics/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
  
# Expected: User dashboard statistics
```

#### Get Skills Analysis
```bash
curl -X GET http://localhost:8000/api/v1/analytics/skills \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
  
# Expected: Skills breakdown and recommendations
```

---

## 🔄 Integration Testing

### End-to-End User Flows

#### 1. Complete Registration to Job Analysis
```bash
1. Register new user via API
2. Login and get JWT token
3. Upload resume via API
4. Navigate to frontend /genie page
5. Paste job description and analyze
6. Verify results display correctly
```

#### 2. Full Frontend Navigation Flow
```bash
1. Visit landing page (/)
2. Navigate to auth page (/auth)
3. Register/login through UI
4. Access dashboard (/dashboard)
5. Visit all protected routes
6. Test logout functionality
```

### Cross-Service Integration

#### Database + API Testing
```bash
# Test data persistence
1. Create user via API
2. Query database directly to verify user exists
3. Upload resume via API  
4. Check file storage in MinIO
5. Verify database contains resume metadata
```

#### Cache Testing
```bash
# Test Redis integration
1. Make API call that should cache results
2. Check Redis for cached data
3. Make same API call and verify faster response
4. Clear cache and verify regeneration
```

---

## ⚡ Performance Testing

### Frontend Performance

#### Page Load Times
```bash
# Use browser dev tools or:
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/

# Create curl-format.txt:
echo "     time_namelookup:  %{time_namelookup}\n\
        time_connect:  %{time_connect}\n\
     time_appconnect:  %{time_appconnect}\n\
    time_pretransfer:  %{time_pretransfer}\n\
       time_redirect:  %{time_redirect}\n\
  time_starttransfer:  %{time_starttransfer}\n\
                     ----------\n\
          time_total:  %{time_total}\n" > curl-format.txt
```

#### API Response Times
```bash
# Test API endpoint performance
for i in {1..10}; do
  curl -w "%{time_total}\n" -o /dev/null -s \
    http://localhost:8000/api/v1/health
done
```

### Load Testing

#### Simple Load Test
```bash
# Install Apache Bench (ab) or use:
npm install -g loadtest

# Test frontend
loadtest -n 100 -c 10 http://localhost:3000/

# Test API
loadtest -n 100 -c 10 http://localhost:8000/api/v1/health
```

---

## 🐛 Testing Scripts

### Automated Frontend Testing
```bash
# Create test script: test-frontend.js
cd frontend

# Run existing tests
npm test

# Run E2E tests (if configured)
npm run test:e2e
```

### Automated API Testing
```bash
# Create test script: test-api.py
cd backend

# Run pytest
pytest tests/

# Run specific test categories
pytest tests/test_auth.py
pytest tests/test_resumes.py
```

### Integration Test Script
```bash
# Create comprehensive test script: test-integration.sh
#!/bin/bash

echo "🧪 Running RezGenie Integration Tests..."

# Check services
docker-compose ps

# Test database connection
cd backend && python -c "
import asyncio
from app.core.database import engine
from sqlalchemy import text
async def test():
    async with engine.begin() as conn:
        await conn.execute(text('SELECT 1'))
    print('✅ Database OK')
asyncio.run(test())
"

# Test API health
curl -f http://localhost:8000/health || echo "❌ API not responding"

# Test frontend
curl -f http://localhost:3000/ || echo "❌ Frontend not responding"

echo "✅ Integration tests complete!"
```

---

## 📊 Test Reporting

### Create Test Reports
```bash
# Frontend test coverage
cd frontend
npm run test:coverage

# Backend test coverage  
cd backend
pytest --cov=app tests/

# Generate HTML reports
pytest --cov=app --cov-report=html tests/
```

### Manual Testing Checklist

Create a checklist for manual testing:

```markdown
## 📋 Manual Testing Checklist

### Frontend Routes
- [ ] Landing page loads and displays correctly
- [ ] Authentication works (login/register)
- [ ] Dashboard shows user data
- [ ] All navigation links work
- [ ] Theme toggle functions
- [ ] Mobile responsive design
- [ ] Form validation works
- [ ] Error pages display correctly

### API Endpoints  
- [ ] Health check returns 200 OK
- [ ] User registration creates account
- [ ] Login returns valid JWT token
- [ ] Protected routes require authentication
- [ ] File upload processes correctly
- [ ] Database operations work
- [ ] Error handling returns proper codes

### Integration
- [ ] Frontend can communicate with backend
- [ ] Database persists data correctly
- [ ] File storage works with MinIO
- [ ] Redis caching functions
- [ ] Background jobs process
```

This comprehensive testing guide ensures your teammate can thoroughly validate the entire application! 🚀