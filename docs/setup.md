# RezGenie Development Environment

This guide will help you set up a complete development environment for RezGenie using conda and Docker.

## Prerequisites

- **Anaconda/Miniconda**: For Python environment management
- **Docker Desktop**: For running infrastructure services
- **Node.js 18+**: For frontend development
- **Git**: For version control

## Quick Setup

### 1. Create and Activate Conda Environment

```powershell
# Create environment
conda create -n rezgenie python=3.11 -y

# Activate environment (restart PowerShell first if needed)
conda activate rezgenie
```

### 2. Install Backend Dependencies

```powershell
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 3. Install Frontend Dependencies

```powershell
cd ../frontend
npm install
```

### 4. Start Infrastructure Services

```powershell
cd ..
docker-compose up -d postgres redis minio
```

### 5. Run Database Migrations

```powershell
cd backend
alembic upgrade head
```

## Development Workflow

### Option 1: Full Docker Development

Run everything in Docker containers:

```powershell
# Start all services
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Option 2: Hybrid Development (Recommended)

Run infrastructure in Docker, applications locally:

```powershell
# 1. Start infrastructure only
docker-compose up -d postgres redis minio

# 2. In one terminal - Backend
conda activate rezgenie
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 3. In another terminal - Frontend
cd frontend
npm run dev

# 4. Optional: Celery worker (for background tasks)
conda activate rezgenie
cd backend
celery -A app.celery.celery_app worker --loglevel=info
```

### Option 3: Local Development Only

Run everything locally (requires local PostgreSQL, Redis, MinIO setup):

```powershell
# Ensure local services are running, then:
conda activate rezgenie
cd backend
uvicorn main:app --reload

# In another terminal
cd frontend
npm run dev
```

## Service URLs

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8000>
- **API Documentation**: <http://localhost:8000/docs>
- **Interactive API**: <http://localhost:8000/redoc>
- **MinIO Console**: <http://localhost:9001> (admin/minioadmin123)
- **Flower (Celery Monitor)**: <http://localhost:5555>

## Environment Configuration

### Backend (.env)

The backend `.env` file should contain:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres123@localhost:5432/rezgenie

# Redis
REDIS_URL=redis://:redis123@localhost:6379/0

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# OpenAI (add your key)
OPENAI_API_KEY=your-key-here

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key
```

### Frontend (.env.local)

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Testing

### Backend Tests

```powershell
conda activate rezgenie
cd backend
pytest
```

### Frontend Tests

```powershell
cd frontend
npm test
```

## Database Management

### Run Migrations

```powershell
cd backend
alembic upgrade head
```

### Create New Migration

```powershell
cd backend
alembic revision --autogenerate -m "Description of changes"
```

### Reset Database

```powershell
docker-compose down -v postgres
docker-compose up -d postgres
cd backend
alembic upgrade head
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**

   ```powershell
   # Find process using port
   netstat -ano | findstr :8000
   
   # Kill process (replace PID)
   taskkill /PID <PID> /F
   ```

2. **Docker Permission Issues**
   - Ensure Docker Desktop is running
   - Run PowerShell as Administrator if needed

3. **Conda Environment Issues**

   ```powershell
   # Recreate environment
   conda deactivate
   conda env remove -n rezgenie
   conda create -n rezgenie python=3.11 -y
   ```

4. **Database Connection Issues**

   ```powershell
   # Check if PostgreSQL is running
   docker-compose ps postgres
   
   # Check logs
   docker-compose logs postgres
   ```

### Useful Commands

```powershell
# Check Docker services status
docker-compose ps

# View all logs
docker-compose logs

# View specific service logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes (resets data)
docker-compose down -v

# Rebuild containers
docker-compose build

# Update a specific service
docker-compose up -d --build backend
```

## Development Tips

1. **Hot Reload**: Both backend (uvicorn) and frontend (Next.js) support hot reload
2. **API Testing**: Use the interactive docs at <http://localhost:8000/docs>
3. **Database Browsing**: Connect to PostgreSQL with any client using the credentials in docker-compose.yml
4. **File Storage**: Access MinIO console at <http://localhost:9001> to view uploaded files
5. **Background Tasks**: Monitor Celery tasks at <http://localhost:5555>
