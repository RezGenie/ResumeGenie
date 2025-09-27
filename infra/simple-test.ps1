# RezGenie Simple Test Script
# Quick health check for RezGenie services

param(
    [string]$TestType = "all"
)

Write-Host "🧪 RezGenie Quick Test" -ForegroundColor Green
Write-Host "Test Type: $TestType" -ForegroundColor Cyan

# Test configuration
$FrontendURL = "http://localhost:3000"
$BackendURL = "http://localhost:8000"
$AltFrontendURL = "http://localhost:3001"

# Function to test URL accessibility
function Test-URL {
    param([string]$url)
    try {
        $response = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 5 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Test Docker services
function Test-DockerServices {
    Write-Host "`n🐳 Testing Docker Services..." -ForegroundColor Yellow
    
    try {
        $services = docker-compose ps --format json | ConvertFrom-Json
        
        $expectedServices = @("postgres", "redis", "minio")
        foreach ($service in $expectedServices) {
            $serviceInfo = $services | Where-Object { $_.Service -eq $service }
            if ($serviceInfo -and $serviceInfo.State -eq "running") {
                Write-Host "✅ ${service}: Running" -ForegroundColor Green
            } else {
                Write-Host "❌ ${service}: Not running" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "❌ Docker services check failed" -ForegroundColor Red
        Write-Host "💡 Start services with: docker-compose up -d" -ForegroundColor Yellow
    }
}

# Test frontend
function Test-Frontend {
    Write-Host "`n🌐 Testing Frontend..." -ForegroundColor Yellow
    
    if (Test-URL $FrontendURL) {
        Write-Host "✅ Frontend accessible at $FrontendURL" -ForegroundColor Green
    } elseif (Test-URL $AltFrontendURL) {
        Write-Host "✅ Frontend accessible at $AltFrontendURL" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend not accessible" -ForegroundColor Red
        Write-Host "💡 Start with: cd frontend; npm run dev" -ForegroundColor Yellow
    }
}

# Test backend
function Test-Backend {
    Write-Host "`n🔌 Testing Backend..." -ForegroundColor Yellow
    
    if (Test-URL $BackendURL) {
        Write-Host "✅ Backend accessible at $BackendURL" -ForegroundColor Green
        
        # Test API docs
        if (Test-URL "$BackendURL/docs") {
            Write-Host "✅ API documentation accessible" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Backend not accessible" -ForegroundColor Red
        Write-Host "💡 Start with: cd backend; conda activate rezgenie; uvicorn main:app --reload" -ForegroundColor Yellow
    }
}

# Run tests based on type
switch ($TestType.ToLower()) {
    "frontend" { Test-Frontend }
    "backend" { Test-Backend }
    "docker" { Test-DockerServices }
    "dependencies" { Test-DockerServices }
    "all" { 
        Test-DockerServices
        Test-Frontend
        Test-Backend
    }
    default {
        Write-Host "❌ Invalid test type: $TestType" -ForegroundColor Red
        Write-Host "Valid options: frontend, backend, docker, dependencies, all" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "`n🎉 Testing completed!" -ForegroundColor Green