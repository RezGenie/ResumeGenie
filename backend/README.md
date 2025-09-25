# 🍑 RezGenie Backend

FastAPI-based backend for the RezGenie AI-powered resume optimization platform.

## 🏗️ Architecture

- **Framework**: FastAPI with async/await support
- **Database**: PostgreSQL with pgvector extension for vector similarity
- **Background Jobs**: Celery with Redis as message broker
- **AI Integration**: OpenAI API for embeddings and GPT-4 recommendations
- **File Storage**: MinIO (S3-compatible) for resume file storage
- **Authentication**: JWT-based authentication with bcrypt password hashing

## 📋 Requirements

- Python 3.11+
- PostgreSQL 14+ with pgvector extension
- Redis 6+
- MinIO or AWS S3
- OpenAI API key

## 🚀 Quick Start with Docker

1. **Clone the repository and navigate to backend:**

   ```bash
   cd backend
   ```

2. **Copy environment variables:**

   ```bash
   cp .env.example .env
   ```

3. **Update your `.env` file with your OpenAI API key:**

   ```bash
   OPENAI_API_KEY=your-openai-api-key-here
   ```

4. **Start all services with Docker Compose:**

   ```bash
   cd ..  # Back to project root
   docker-compose up --build
   ```

5. **The API will be available at:**
   - API: <http://localhost:8000>
   - API Docs: <http://localhost:8000/docs>
   - Flower (Celery monitoring): <http://localhost:5555>

## 🛠️ Local Development Setup

### Prerequisites

1. **Install Python 3.11+**
2. **Install PostgreSQL with pgvector:**

   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo apt-get install postgresql-14-pgvector
   
   # macOS with Homebrew
   brew install postgresql pgvector
   
   # Windows: Use pgvector/pgvector Docker image
   ```

3. **Install Redis:**

   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   
   # macOS with Homebrew
   brew install redis
   
   # Windows: Use Redis Docker image
   ```

### Setup Steps

1. **Create and activate virtual environment:**

   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

2. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize database:**

   ```bash
   python setup_db.py
   ```

5. **Run database migrations:**

   ```bash
   alembic upgrade head
   ```

6. **Start the development server:**

   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

7. **Start Celery worker (in another terminal):**

   ```bash
   celery -A app.celery.celery_app worker --loglevel=info
   ```

8. **Start Flower for monitoring (optional):**

   ```bash
   celery -A app.celery.celery_app flower
   ```

## 📊 Database Schema

### Core Models

- **User**: User accounts with authentication
- **Resume**: Uploaded resume files with extracted text and embeddings
- **JobComparison**: Job description comparisons with similarity scores
- **GenieWish**: AI-powered recommendations with daily limits
- **DailyWishCount**: Tracking daily wish usage per user

### Key Features

- **Vector Search**: Uses pgvector for fast semantic similarity searches
- **Async Operations**: All database operations are async for better performance
- **Automatic Migrations**: Alembic handles database schema changes

## 🔧 Configuration

Key environment variables:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/rezgenie

# Redis & Celery
REDIS_URL=redis://:password@localhost:6379/0
CELERY_BROKER_URL=redis://:password@localhost:6379/0

# OpenAI
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# File Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# Security
JWT_SECRET_KEY=your-secret-key
JWT_EXPIRE_MINUTES=60

# Application
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=info
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v
```

## 📝 API Documentation

When running in development mode, visit:

- **Swagger UI**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>

## 🚀 Deployment

### Production Checklist

1. **Environment Variables:**
   - Set `ENVIRONMENT=production`
   - Set `DEBUG=false`
   - Use strong `JWT_SECRET_KEY`
   - Configure production database URL

2. **Security:**
   - Enable HTTPS
   - Configure CORS properly
   - Set up trusted host middleware
   - Use environment-specific secrets

3. **Performance:**
   - Configure connection pooling
   - Set up Redis for caching
   - Optimize database indexes
   - Monitor with health checks

### Docker Production Build

```bash
# Build production image
docker build -t rezgenie-backend:latest .

# Run with production settings
docker run -p 8000:8000 --env-file .env.production rezgenie-backend:latest
```

## 📊 Monitoring

- **Health Check**: `/health` endpoint
- **Metrics**: Built-in timing middleware
- **Celery Monitoring**: Flower dashboard at :5555
- **Logs**: Structured logging with configurable levels

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes with tests
3. Run linting: `black . && isort . && flake8`
4. Run tests: `pytest`
5. Submit pull request

## 📚 Project Structure

```plaintext
backend/
├── app/               # Main application code
│   ├── api/           # API endpoints (auth, resumes, jobs, genie)
│   ├── celery/        # Background tasks processing
│   ├── core/          # Core functionality (config, database, security)
│   ├── models/        # Database models
│   └── services/      # Business logic services
├── alembic/           # Database migrations
├── tests/             # Test files
├── main.py            # FastAPI application
├── requirements.txt   # Python dependencies
└── Dockerfile         # Container configuration
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error:**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Ensure pgvector extension is installed

2. **Redis Connection Error:**
   - Check Redis is running
   - Verify REDIS_URL in .env
   - Check Redis authentication

3. **OpenAI API Error:**
   - Verify OPENAI_API_KEY is set
   - Check API quota and limits
   - Ensure internet connectivity

4. **File Upload Issues:**
   - Check MinIO is running
   - Verify MinIO credentials
   - Check file permissions

For more help, check the logs or create an issue in the repository.
