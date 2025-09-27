# RezGenie Development Environment Setup Script
# This script sets up the conda environment and installs dependencies

Write-Host "🚀 Setting up RezGenie development environment..." -ForegroundColor Green

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check if conda is available
if (-not (Test-Command "conda")) {
    Write-Host "❌ Conda is not available. Please install Anaconda or Miniconda first." -ForegroundColor Red
    Write-Host "📥 Download from: https://docs.conda.io/en/latest/miniconda.html" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is available
if (-not (Test-Command "docker")) {
    Write-Host "❌ Docker is not available. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "📥 Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Node.js is available
if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js is not available. Please install Node.js 18+ first." -ForegroundColor Red
    Write-Host "📥 Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green

# Get the script directory and navigate to project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host "📁 Project root: $ProjectRoot" -ForegroundColor Cyan

# Create conda environment if it doesn't exist
Write-Host "🔄 Setting up conda environment 'rezgenie'..." -ForegroundColor Yellow
$envExists = conda env list | Select-String "rezgenie"
if (-not $envExists) {
    Write-Host "📦 Creating new conda environment..." -ForegroundColor Yellow
    conda create -n rezgenie python=3.11 -y
} else {
    Write-Host "✅ Conda environment 'rezgenie' already exists" -ForegroundColor Green
}

# Install backend dependencies
Write-Host "📦 Installing backend Python dependencies..." -ForegroundColor Yellow
Set-Location "backend"
& pip install -r requirements.txt

# Download spaCy model
Write-Host "🧠 Downloading spaCy English model..." -ForegroundColor Yellow
& python -m spacy download en_core_web_sm

# Go back to project root
Set-Location ".."

# Install frontend dependencies
Write-Host "📦 Installing frontend Node.js dependencies..." -ForegroundColor Yellow
Set-Location "frontend"
& npm install

# Go back to project root
Set-Location ".."

Write-Host "✅ Development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🐳 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the infrastructure: docker-compose up -d postgres redis minio"
Write-Host "2. Run database migrations: cd backend && alembic upgrade head"
Write-Host "3. Start the backend: cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
Write-Host "4. Start the frontend: cd frontend && npm run dev"
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:3000"
Write-Host "- Backend API: http://localhost:8000"
Write-Host "- API Docs: http://localhost:8000/docs"
Write-Host "- MinIO Console: http://localhost:9001"
Write-Host "- Flower (Celery Monitor): http://localhost:5555"