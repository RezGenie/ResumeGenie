# 🚀 RezGenie Developer Quick Reference

## ⚡ Quick Start (New Developers)

```powershell
# 1. One-time setup (30 minutes)
.\infra\setup_dev_env.ps1

# 2. Start services (daily workflow)
docker-compose up -d                    # Infrastructure
cd frontend; npm run dev                 # Frontend (port 3000/3001)
.\infra\start-backend.ps1               # Backend (port 8000)

# 3. Validate everything works
.\infra\quick-test.ps1 -TestType all
```

## 📚 For New Team Members

**Prerequisites:** Anaconda/Miniconda, Docker Desktop, Node.js 18+, Git

**Setup Steps:**
1. Clone repo: `git clone [repo-url] && cd RezGenie`
2. Run setup: `.\infra\setup_dev_env.ps1`
3. Test setup: `.\infra\quick-test.ps1 -TestType all`
4. Start coding! 🎉

**Need Help?** See [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed procedures.

## 🔧 Daily Development Workflow

### 1. Start Development Session

```powershell
# Start infrastructure
docker-compose up -d

# Activate Python environment
conda activate rezgenie

# Start frontend (new terminal)
cd frontend
npm run dev

# Start backend (new terminal) 
cd backend
uvicorn main:app --reload
```

### 2. Test Everything

```powershell
# Quick health check
.\infra\quick-test.ps1 -TestType all

# Test specific components
.\infra\quick-test.ps1 -TestType frontend
.\infra\quick-test.ps1 -TestType backend
.\infra\quick-test.ps1 -TestType docker

# Comprehensive testing (see TESTING_GUIDE.md)
.\infra\test-application.ps1 -TestType all -Verbose
```

### 3. Stop Development Session

```powershell
# Stop services
docker-compose down

# Deactivate conda (if active)
conda deactivate
```

## 🌐 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | <http://localhost:3000> or :3001 | Next.js application |
| Backend API | <http://localhost:8000> | FastAPI server |
| API Docs | <http://localhost:8000/docs> | Interactive API documentation |
| PostgreSQL | localhost:5432 | Database (rezgenie/rezgenie) |
| Redis | localhost:6379 | Cache (password: rezgenie123) |
| MinIO Console | <http://localhost:9001> | S3 Storage UI (admin/password123) |

## 🐛 Common Issues & Solutions

### Frontend Issues

```powershell
# Port conflict (frontend starts on 3001)
# ✅ This is normal, app works on both ports

# Dependencies issues
cd frontend
npm install
rm -rf .next  # Clear Next.js cache
npm run dev
```

### Backend Issues

```powershell
# Import errors (PyPDF2/pypdf)
conda activate rezgenie
pip install --upgrade pypdf PyPDF2 python-magic-bin

# Database connection issues
docker-compose restart postgres
# Wait 30 seconds, then restart backend
```

### Docker Issues

```powershell
# Services won't start
docker-compose down
docker system prune -f  # Clean up
docker-compose up -d

# Check service health
docker-compose ps
docker-compose logs postgres  # or redis, minio
```

### Environment Issues

```powershell
# Conda environment missing
conda create -n rezgenie python=3.11
conda activate rezgenie
pip install -r backend/requirements.txt

# Path issues
# Ensure you're in project root: c:\Users\salih\Desktop\projects\RezGenie
```

## 📁 Project Structure Quick Reference

```plaintext
RezGenie/
├── backend/           # FastAPI application
│   ├── app/          # Main application code
│   ├── main.py       # FastAPI entry point
│   └── requirements.txt
├── frontend/         # Next.js application  
│   ├── src/app/      # App router pages
│   ├── components/   # Reusable components
│   └── package.json
├── infra/           # Infrastructure & scripts
│   ├── setup_dev_env.ps1      # Environment setup
│   └── test-application.ps1   # Testing script
├── docs/            # Documentation
│   ├── DEVELOPER_SETUP.md     # Full setup guide
│   └── TESTING_GUIDE.md       # Testing procedures
└── docker-compose.yml         # Service definitions
```

## 🧪 Testing Strategies

### Quick Health Check

```powershell
.\infra\test-application.ps1 -TestType dependencies
```

### Frontend Development

```powershell
# Test all routes
.\infra\test-application.ps1 -TestType frontend -Verbose

# Manual testing checklist:
# - Visit http://localhost:3000 (or :3001)
# - Navigate through all pages
# - Test responsive design
# - Check console for errors
```

### Backend Development

```powershell
# Test API endpoints
.\infra\test-application.ps1 -TestType backend -Verbose

# Manual API testing:
# - Visit http://localhost:8000/docs
# - Test endpoints interactively
# - Check database connections
```

### Full Integration

```powershell
# Complete test suite
.\infra\test-application.ps1 -TestType all

# Manual integration testing:
# - Test user registration/login flow
# - Upload resume and test analysis
# - Test job search functionality
```

## 📊 Development Status

### ✅ Fully Working

- Docker infrastructure (PostgreSQL, Redis, MinIO)
- Frontend application (all 15+ routes)
- Database schema and connections
- Development environment setup
- Comprehensive testing framework

### 🔧 In Progress  

- Backend API (minor import fixes needed)
- Authentication flow integration
- File upload processing

### ⏳ Planned

- Production deployment configuration
- Automated CI/CD pipeline
- Performance optimization

## 🎯 Next Steps for New Developers

1. **First Time Setup** (30 minutes)

   ```powershell
   .\infra\setup_dev_env.ps1
   .\infra\test-application.ps1 -TestType all
   ```

2. **Understand the Codebase** (60 minutes)
   - Read `docs/DEVELOPER_SETUP.md`
   - Explore frontend routes at <http://localhost:3000>
   - Review API docs at <http://localhost:8000/docs>
   - Check database schema in pgAdmin or DBeaver

3. **Start Contributing** (ongoing)
   - Pick issues from project backlog  
   - Follow testing procedures in `docs/TESTING_GUIDE.md`
   - Use this quick reference for daily workflow

## 💡 Pro Tips

- Always activate conda environment: `conda activate rezgenie`
- Use `-Verbose` flag for detailed testing output
- Keep Docker services running during development
- Test frontend on both port 3000 and 3001
- Check service logs if issues occur: `docker-compose logs [service]`
- Frontend hot-reloads automatically, backend requires restart for some changes

---
*Last updated: September 2025*  
*For detailed instructions, see `docs/DEVELOPER_SETUP.md` and `docs/TESTING_GUIDE.md`*
