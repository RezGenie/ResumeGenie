# RezGenie
An AI-powered resume helper with daily wishes, job fit scoring, and swipe-to-apply magic.

## 🚀 Features

- **Smart Resume Analysis**: Upload your resume and get AI-powered parsing with skill extraction and ATS optimization tips
- **Job Fit Scoring**: Compare your resume against job descriptions and get detailed fit scores with missing skills analysis  
- **Daily Genie Wishes**: Get 3 daily AI-powered career tips, ATS advice, and personalized skill development recommendations
- **JWT Authentication**: Secure user authentication and authorization
- **Vector Embeddings**: Uses OpenAI embeddings with pgvector for intelligent resume-job matching
- **Background Processing**: Celery workers for heavy AI processing tasks
- **Real-time Updates**: Redis for caching and real-time features

## 🏗️ Architecture

### Monorepo Structure
```
RezGenie/
├── backend/          # FastAPI backend
├── frontend/         # Next.js frontend  
├── docker/           # Docker configuration
├── .github/          # CI/CD workflows
└── docker-compose.yml
```

### Tech Stack

**Backend:**
- FastAPI (Python web framework)
- PostgreSQL with pgvector (vector database)
- Redis (caching & session management)
- Celery (background task processing)
- SQLAlchemy (ORM)
- OpenAI API (embeddings & AI features)
- spaCy (NLP processing)

**Frontend:**
- Next.js 14 (React framework)
- TypeScript
- Tailwind CSS
- React Query (state management)
- React Hook Form (form handling)

**Infrastructure:**
- Docker & Docker Compose
- GitHub Actions (CI/CD)
- AWS/Azure/GCP ready

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- OpenAI API key
- Git

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/RezGenie/RezGenie.git
cd RezGenie
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your OpenAI API key and other settings
```

3. **Start the application**
```bash
docker-compose up -d
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Manual Setup (Development)

**Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend Setup:**
```bash
cd frontend  
npm install
npm run dev
```

## 📚 API Documentation

The API documentation is automatically generated and available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Main Endpoints

- **Authentication**: `/api/v1/auth/`
- **Resume Management**: `/api/v1/resumes/`
- **Job Analysis**: `/api/v1/jobs/`
- **Daily Wishes**: `/api/v1/wishes/`

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_super_secret_jwt_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/rezgenie
REDIS_URL=redis://localhost:6379
```

### Database Setup

The application uses PostgreSQL with the pgvector extension for storing embeddings:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 🧪 Testing

**Backend Tests:**
```bash
cd backend
pytest tests/ -v
```

**Frontend Tests:**
```bash
cd frontend
npm test
```

**Code Quality:**
```bash
# Backend
cd backend
black .
isort .
flake8 .

# Frontend  
cd frontend
npm run lint
```

## 🚀 Deployment

### Using Docker

1. **Build and push images**
```bash
docker-compose build
docker-compose push
```

2. **Deploy to production**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### CI/CD Pipeline

The project includes GitHub Actions workflows for:
- Code quality checks (linting, type checking)
- Automated testing
- Security scanning
- Docker image building and publishing
- Deployment automation

## 📱 Usage

1. **Register/Login**: Create an account or sign in
2. **Upload Resume**: Upload your PDF or Word resume  
3. **Add Job Descriptions**: Paste job descriptions you're interested in
4. **Get Analysis**: View fit scores, missing skills, and AI feedback
5. **Daily Wishes**: Check your dashboard for daily career tips

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] LinkedIn integration
- [ ] ATS compatibility scoring
- [ ] Interview preparation features
- [ ] Salary insights
- [ ] Job board integration
