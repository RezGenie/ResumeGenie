# 🧞‍♂️ RezGenie

> AI-powered resume optimization platform that helps job seekers land their dream jobs

## 🎯 Project Overview

RezGenie is an intelligent resume analysis and optimization platform that leverages AI to help job seekers improve their resumes and increase their chances of landing interviews. Our AI genie provides personalized recommendations, skill gap analysis, and job matching insights.

## 🚀 Key Features

- **Smart Resume Analysis**: AI-powered parsing and analysis of resume content
- **Job Matching**: Intelligent matching between resumes and job postings
- **Skill Gap Identification**: Identifies missing skills and provides learning recommendations  
- **ATS Optimization**: Ensures resumes are optimized for Applicant Tracking Systems
- **Interview Preparation**: Tailored advice for interview success
- **Career Guidance**: Personalized career path recommendations

## 👯 Team

- **Backend Lead**: Salih [(@salihelfatih)](https://github.com/salihelfatih) - API architecture, AI integration, database design
- **Frontend Lead**: Andy [(@AndyPham2341)](https://github.com/AndyPham2341) - User interface, user experience, responsive design
- **AI/ML Engineer**: Yaqin [(@yalbirawi)](https://github.com/yalbirawi) - Machine learning models, natural language processing
- **DevOps Engineer**: David [(@dle519)](https://github.com/dle519) - Cloud infrastructure, CI/CD, deployment automation

## 🛠️ Technology Stack

### Backend

- **Framework**: FastAPI (Python) with async support
- **Database**: PostgreSQL 16 with pgvector extension
- **AI/ML**: OpenAI GPT-4, embeddings, spaCy NLP
- **Authentication**: JWT with advanced security features
- **Background Tasks**: Celery with Redis
- **Storage**: MinIO S3-compatible storage

### Frontend

- **Framework**: Next.js (React & TypeScript)
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **UI Components**: Headless UI, Heroicons

### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Monitoring**: Comprehensive logging and health checks
- **Documentation**: Automated API documentation

## 🏗️ Project Structure

```plaintext
RezGenie/
├── backend/                # FastAPI backend application
├── frontend/               # React frontend
├── docker-compose.yml      # Development environment setup
├── docs/                   # Project documentation
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/RezGenie/ResumeGenie.git
   cd ResumeGenie
   ```

2. **Set up environment variables**

   ```bash
   # Copy example environment file
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys and configuration
   ```

3. **Start the development environment**

   ```bash
   # Start all services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   ```

4. **Access the application**
   - **API Documentation**: <http://localhost:8000/docs>
   - **Frontend**: <http://localhost:3000>
   - **MinIO Console**: <http://localhost:9001>

For detailed setup instructions and API documentation, see **[Backend README](backend/README.md)**

## 🧪 Testing

```bash
# Run backend tests
cd backend
python -m pytest tests/ -v
```

## 📚 Documentation

- [Backend Documentation](backend/README.md) - Detailed technical documentation
- [Changelog](docs/CHANGELOG.md) - Project progress and completed features
- [Design Document](docs/design.md) - System architecture
- [Requirements](docs/requirements.md) - Functional requirements  
- [Task Tracking](docs/tasks.md) - Development progress

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the established patterns
4. Add tests for new functionality
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- OpenAI for providing powerful AI models and embeddings
- FastAPI community for the excellent async framework
- PostgreSQL and pgvector for vector similarity search
- All contributors who help make RezGenie better

---

Built with 💖 by the RezGenie team
