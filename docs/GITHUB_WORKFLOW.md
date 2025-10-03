# 🌿 GitHub Branch Management Guide

## 🚀 Quick Branch Creation & Push

### 1. Create Feature Branch

```bash
# From main branch
git checkout main
git pull origin main

# Create new feature branch
git checkout -b feature/fix-wish-history-display

# Alternative: Create branch for specific issue
git checkout -b CP-15-fix-wish-history-bug
```

### 2. Stage & Commit Changes

```bash
# Check what files changed
git status

# Add specific files
git add frontend/src/app/genie/page.tsx
git add backend/requirements.txt
git add docs/JIRA_ISSUE_TEMPLATE.md

# Or add all changes
git add .

# Commit with descriptive message
git commit -m "fix: Add wishes to history list when submitted

- Create wish object when analysis starts
- Add wish to wishes state array immediately  
- Update wish status from processing to completed
- Display wishes in reverse chronological order
- Fix empty wish history issue

Resolves: CP-15"
```

### 3. Push to GitHub

```bash
# First time push (creates remote branch)
git push -u origin feature/fix-wish-history-display

# Subsequent pushes
git push
```

## 📋 Branch Naming Conventions

### Feature Branches

```bash
feature/wish-history-display
feature/backend-integration  
feature/user-authentication
```

### Bug Fix Branches

```bash
fix/wish-history-empty
fix/file-upload-validation
fix/auth-token-refresh
```

### Jira Ticket Branches

```bash
CP-15-fix-wish-history-bug
CP-16-integrate-backend-api
CP-17-add-error-handling
```

## 🔄 Complete Workflow for This Issue

### 1. Create Branch

```bash
git checkout main
git pull origin main
git checkout -b CP-15-fix-wish-history-display
```

### 2. Make Changes (DONE ✅)

- ✅ Fixed `frontend/src/app/genie/page.tsx`
- ✅ Updated `backend/requirements.txt`
- ✅ Created documentation

### 3. Test Changes

```bash
# Start development servers
docker-compose up -d
cd frontend && npm run dev
.\infra\start-backend.ps1

# Test the fix
# 1. Go to http://localhost:3000/genie
# 2. Upload resume and enter job posting  
# 3. Click "Make Your Wish"
# 4. Verify wish appears in history
# 5. Wait for completion and verify status updates
```

### 4. Commit & Push

```bash
git add .
git commit -m "fix: Add wishes to history list and update requirements

- Fix wish history display by adding wishes to state array
- Update wishes from processing to completed status  
- Add missing Python packages to requirements.txt
- Create Jira issue template for tracking

Fixes empty wish history issue where completed wishes
weren't showing in the history section.

Resolves: CP-15"

git push -u origin CP-15-fix-wish-history-display
```

### 5. Create Pull Request

1. Go to GitHub repository
2. Click "Compare & pull request"
3. Fill out PR template:

```markdown
## 🎯 Purpose
Fix wish history display - wishes now appear in history list when submitted

## 🔧 Changes Made
- ✅ **Fix Wish History**: Wishes now added to history when submitted
- ✅ **Status Updates**: Wishes show "processing" → "completed" status  
- ✅ **Requirements**: Updated with missing Python packages
- ✅ **Documentation**: Added Jira issue template

## 🧪 Testing
- [x] Wishes appear in history immediately when submitted
- [x] Status updates from processing to completed
- [x] Wishes display in reverse chronological order
- [x] All existing functionality still works

## 📸 Screenshots
[Add before/after screenshots of wish history]

## 🎟️ Related Issues
Resolves: CP-15 - Fix Wish History Display Bug

## 🚀 Next Steps
- [ ] Backend integration for wish persistence
- [ ] Error handling for failed wishes
- [ ] Wish details expansion
```

## 📊 Frontend-Backend Integration Planning

### Phase 1: API Endpoints (Next Sprint)

```typescript
// Wish API endpoints to implement
POST /api/v1/genie/wishes          // Create new wish
GET  /api/v1/genie/wishes          // Get user's wish history
GET  /api/v1/genie/wishes/:id      // Get specific wish details
PUT  /api/v1/genie/wishes/:id      // Update wish status/results
```

### Phase 2: Frontend Integration

```typescript
// Replace mock data with real API calls
const submitWish = async (resumeFile: File, jobPosting: string) => {
  const formData = new FormData()
  formData.append('resume', resumeFile)
  formData.append('jobPosting', jobPosting)
  
  const response = await fetch('/api/v1/genie/wishes', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  return response.json()
}
```

### Phase 3: Real-time Updates

```typescript
// WebSocket or polling for wish status updates
const useWishStatus = (wishId: string) => {
  const [status, setStatus] = useState('processing')
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const wish = await fetchWishStatus(wishId)
      setStatus(wish.status)
      if (wish.status === 'completed') {
        clearInterval(interval)
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [wishId])
  
  return status
}
```

## 🎯 Ready to Push Commands

```bash
# If you're ready to push everything now:
git add .
git commit -m "fix: Complete wish history and requirements updates

- Fix wish history display issue
- Update Python requirements with missing packages  
- Add Jira issue template and GitHub workflow docs
- Prepare for backend integration phase

Resolves: CP-15"

git push -u origin CP-15-fix-wish-history-display
```

Then create the PR on GitHub! 🚀
