# 🔗 Frontend-Backend Integration Plan

## 🎯 Integration Strategy Overview

### Current State
- ✅ **Frontend**: Fully functional UI with mock data
- ✅ **Backend**: FastAPI server with database models
- ✅ **Infrastructure**: Docker services running (PostgreSQL, Redis, MinIO)
- ✅ **Authentication**: JWT implementation in backend

### Integration Phases

## 📋 Phase 1: Core API Integration (Week 1)

### 1.1 Authentication Flow
**Priority: HIGH**

**Backend Tasks:**
```python
# Already implemented in backend/app/api/v1/auth.py
POST /api/v1/auth/register
POST /api/v1/auth/login  
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
```

**Frontend Tasks:**
```typescript
// Update frontend/src/contexts/AuthContext.tsx
const login = async (email: string, password: string) => {
  const response = await fetch('http://localhost:8000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  
  if (response.ok) {
    const { access_token } = await response.json()
    localStorage.setItem('token', access_token)
    // Update auth state
  }
}
```

### 1.2 File Upload Service
**Priority: HIGH**

**Backend Implementation:**
```python
# Create endpoint in backend/app/api/v1/resumes.py
@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate file type and size
    # Save to MinIO storage
    # Extract text content
    # Save metadata to database
    return {"file_id": file_id, "content_preview": preview}
```

**Frontend Integration:**
```typescript
// Update frontend/src/app/genie/page.tsx
const uploadResume = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('http://localhost:8000/api/v1/resumes/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  return response.json()
}
```

### 1.3 Wish Management API
**Priority: HIGH**

**Backend Models & Endpoints:**
```python
# backend/app/models/genie_wish.py - Already exists!
# backend/app/api/v1/genie.py

@router.post("/wishes")
async def create_wish(
    wish_data: WishCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Create wish in database
    # Queue background job for analysis
    # Return wish ID and initial status

@router.get("/wishes")  
async def get_user_wishes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Return paginated user wishes

@router.get("/wishes/{wish_id}")
async def get_wish_details(
    wish_id: int,
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    # Return full wish details with results
```

## 📋 Phase 2: Real-time Features (Week 2)

### 2.1 WebSocket for Wish Status Updates
**Priority: MEDIUM**

**Backend WebSocket:**
```python
# backend/app/api/websocket.py
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await websocket.accept()
    # Subscribe to wish status updates
    # Send real-time status changes
```

**Frontend WebSocket Client:**
```typescript
// frontend/src/hooks/useWishUpdates.ts
const useWishUpdates = (userId: string) => {
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${userId}`)
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data)
      // Update wish status in real-time
    }
  }, [userId])
}
```

### 2.2 Background Job Processing
**Priority: MEDIUM**

**Celery Integration:**
```python
# backend/app/celery/tasks/resume_analysis.py
@celery_app.task
def analyze_resume_job_match(wish_id: int, resume_content: str, job_posting: str):
    # Perform AI analysis
    # Update wish status in database
    # Send WebSocket notification
    pass
```

## 📋 Phase 3: Advanced Features (Week 3)

### 3.1 AI Integration
**Priority: MEDIUM**

```python
# backend/app/services/ai_analysis.py
class ResumeAnalyzer:
    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.openai_api_key)
    
    async def analyze_resume_match(self, resume_text: str, job_posting: str):
        # Use OpenAI GPT-4 for analysis
        # Return structured results
        pass
```

### 3.2 File Processing Pipeline
**Priority: MEDIUM**

```python
# backend/app/services/file_processor.py
class FileProcessor:
    async def extract_text_from_pdf(self, file_path: str) -> str:
        # Use PyPDF2 to extract text
        pass
    
    async def extract_text_from_doc(self, file_path: str) -> str:
        # Use python-docx to extract text
        pass
```

## 🛠️ Implementation Steps

### Step 1: Environment Setup (30 minutes)
```bash
# Frontend environment variables
# Create frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Backend environment variables  
# Update backend/.env
OPENAI_API_KEY=your_openai_key_here
FRONTEND_URL=http://localhost:3000
```

### Step 2: API Client Setup (1 hour)
```typescript
// frontend/src/lib/api.ts
class APIClient {
  private baseURL = process.env.NEXT_PUBLIC_API_URL
  
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token')
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      }
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  // Auth methods
  auth = {
    login: (email: string, password: string) => 
      this.request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    
    register: (userData: RegisterData) =>
      this.request('/api/v1/auth/register', {
        method: 'POST', 
        body: JSON.stringify(userData)
      })
  }
  
  // Genie methods
  genie = {
    createWish: (wishData: CreateWishData) =>
      this.request('/api/v1/genie/wishes', {
        method: 'POST',
        body: JSON.stringify(wishData)
      }),
      
    getWishes: () => this.request('/api/v1/genie/wishes'),
    
    uploadResume: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      return fetch(`${this.baseURL}/api/v1/resumes/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }).then(r => r.json())
    }
  }
}

export const apiClient = new APIClient()
```

### Step 3: Update Genie Page (2 hours)
```typescript
// frontend/src/app/genie/page.tsx - Replace mock logic
const handleSubmit = async () => {
  try {
    setIsAnalyzing(true)
    
    // 1. Upload resume file
    const fileUpload = await apiClient.genie.uploadResume(resumeFile)
    
    // 2. Create wish
    const wish = await apiClient.genie.createWish({
      type: 'resume_analysis',
      resume_id: fileUpload.file_id,
      job_posting: jobPosting,
      title: 'Resume & Job Match Analysis',
      description: `Analysis of ${resumeFile.name} against job posting`
    })
    
    // 3. Add to local state
    setWishes(prev => [wish, ...prev])
    setDailyWishes(prev => prev + 1)
    
    // 4. Poll for results or use WebSocket
    pollWishStatus(wish.id)
    
  } catch (error) {
    console.error('Error submitting wish:', error)
    alert('Failed to submit wish. Please try again.')
  } finally {
    setIsAnalyzing(false)
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
// frontend/src/lib/__tests__/api.test.ts
describe('APIClient', () => {
  test('should login successfully', async () => {
    const mockResponse = { access_token: 'test-token' }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })
    
    const result = await apiClient.auth.login('test@example.com', 'password')
    expect(result).toEqual(mockResponse)
  })
})
```

### Integration Tests
```python
# backend/tests/test_genie_api.py
async def test_create_wish(client: AsyncClient, auth_headers):
    response = await client.post(
        "/api/v1/genie/wishes",
        json={
            "type": "resume_analysis",
            "title": "Test Wish",
            "description": "Test Description"
        },
        headers=auth_headers
    )
    assert response.status_code == 201
```

## 📊 Progress Tracking

### Phase 1 Checklist
- [ ] **Authentication Flow** (2 days)
  - [ ] Update AuthContext with real API calls
  - [ ] Add error handling and loading states
  - [ ] Test login/register/logout flow
  
- [ ] **File Upload** (1 day)  
  - [ ] Implement resume upload endpoint
  - [ ] Add file validation and error handling
  - [ ] Test with various file types
  
- [ ] **Wish Management** (2 days)
  - [ ] Create wish CRUD endpoints  
  - [ ] Update frontend to use real API
  - [ ] Add wish status polling

### Phase 2 Checklist  
- [ ] **Real-time Updates** (2 days)
  - [ ] Implement WebSocket connection
  - [ ] Add wish status broadcasting
  - [ ] Handle connection failures
  
- [ ] **Background Processing** (1 day)
  - [ ] Set up Celery tasks
  - [ ] Add job queue monitoring
  - [ ] Test async processing

### Phase 3 Checklist
- [ ] **AI Integration** (3 days)
  - [ ] Implement OpenAI analysis
  - [ ] Add structured response parsing
  - [ ] Test various resume/job combinations
  
- [ ] **Production Polish** (2 days)
  - [ ] Add comprehensive error handling
  - [ ] Implement request rate limiting
  - [ ] Add monitoring and logging

## 🚀 Quick Start Commands

### Start Integration Development
```bash
# 1. Ensure backend is running with our fixes
.\infra\start-backend.ps1

# 2. Start frontend in development mode
cd frontend && npm run dev

# 3. Test current mock functionality
# Visit http://localhost:3000/genie

# 4. Create integration branch
git checkout -b feature/frontend-backend-integration

# 5. Begin Phase 1 implementation
```

### Next Immediate Steps
1. **Fix wish history UI** ✅ (DONE)
2. **Update requirements.txt** ✅ (DONE)  
3. **Create branch and push** (READY)
4. **Start Phase 1: Authentication API integration**
5. **Implement file upload integration**

The foundation is solid - let's connect the pieces! 🔗