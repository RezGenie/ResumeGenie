#!/bin/bash

echo "🚀 Setting up RezGenie development environment..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
if ! command_exists conda; then
    echo "❌ Conda is not available. Please install Anaconda or Miniconda first."
    echo "📥 Download from: https://docs.conda.io/en/latest/miniconda.html"
    exit 1
fi

if ! command_exists docker; then
    echo "❌ Docker is not available. Please install Docker Desktop first."
    echo "📥 Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command_exists node; then
    echo "❌ Node.js is not available. Please install Node.js 18+ first."
    echo "📥 Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT" || exit

echo "📁 Project root: $PROJECT_ROOT"

# Create conda environment if it doesn't exist
echo "🔄 Setting up conda environment 'rezgenie'..."
if ! conda env list | grep -q "rezgenie"; then
    echo "📦 Creating new conda environment..."
    conda create -n rezgenie python=3.11 -y
else
    echo "✅ Conda environment 'rezgenie' already exists"
fi

# Activate environment and install backend dependencies
echo "📦 Installing backend Python dependencies..."
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate rezgenie
cd backend || exit
pip install -r requirements.txt

# Download spaCy model
echo "🧠 Downloading spaCy English model..."
python -m spacy download en_core_web_sm

cd ..

# Install frontend dependencies
echo "📦 Installing frontend Node.js dependencies..."
cd frontend || exit
npm install

cd ..

echo "✅ Development environment setup complete!"
echo ""
echo "🐳 Next steps:"
echo "1. Start the infrastructure: docker-compose up -d postgres redis minio"
echo "2. Run database migrations: cd backend && alembic upgrade head"
echo "3. Start the backend: cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo "4. Start the frontend: cd frontend && npm run dev"
echo ""
echo "🌐 Access URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8000"
echo "- API Docs: http://localhost:8000/docs"
echo "- MinIO Console: http://localhost:9001"
echo "- Flower (Celery Monitor): http://localhost:5555"