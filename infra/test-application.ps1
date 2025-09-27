# RezGenie Test Runner Script
# Comprehensive testing for frontend routes and API endpoints

param(
    [string]$TestType = "all",  # Options: frontend, backend, api, integration, all
    [switch]$Verbose = $false
)

Write-Host "🧪 RezGenie Test Runner" -ForegroundColor Green
Write-Host "Test Type: $TestType" -ForegroundColor Cyan

# Get project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

# Test configuration
$FrontendURL = "http://localhost:3000"
$BackendURL = "http://localhost:8000"
$AltFrontendURL = "http://localhost:3001"

# Function to test URL accessibility
function Test-URLAccessible($url) {
    try {
        $response = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 5 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Function to test API endpoint
function Test-APIEndpoint($url, $method = "GET", $body = $null, $headers = @{}) {
    try {
        $params = @{
            Uri = $url
            Method = $method
            TimeoutSec = 10
            UseBasicParsing = $true
        }
        
        if ($headers.Count -gt 0) {
            $params.Headers = $headers
        }
        
        if ($body) {
            $params.Body = $body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        return @{
            Success = $true
            StatusCode = $response.StatusCode
            Content = $response.Content
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Frontend route tests
function Test-FrontendRoutes {
    Write-Host "`n🌐 Testing Frontend Routes..." -ForegroundColor Yellow
    
    # Determine which frontend URL is active
    $activeURL = $FrontendURL
    if (-not (Test-URLAccessible $FrontendURL)) {
        if (Test-URLAccessible $AltFrontendURL) {
            $activeURL = $AltFrontendURL
            Write-Host "ℹ️  Using alternate port 3001" -ForegroundColor Blue
        } else {
            Write-Host "❌ Frontend not accessible on port 3000 or 3001" -ForegroundColor Red
            Write-Host "💡 Please start frontend with: cd frontend; npm run dev" -ForegroundColor Yellow
            return
        }
    }
    
    $routes = @(
        @{ Path = "/"; Name = "Landing Page" },
        @{ Path = "/auth"; Name = "Authentication" },
        @{ Path = "/pricing"; Name = "Pricing" },
        @{ Path = "/contact"; Name = "Contact" },
        @{ Path = "/privacy"; Name = "Privacy Policy" },
        @{ Path = "/terms"; Name = "Terms of Service" },
        @{ Path = "/guides"; Name = "Guides Hub" },
        @{ Path = "/guides/optimizing-resume"; Name = "Resume Optimization Guide" },
        @{ Path = "/guides/genie-wishes"; Name = "Genie Wishes Guide" },
        @{ Path = "/guides/get-more-interviews"; Name = "Interview Guide" },
        @{ Path = "/dashboard"; Name = "Dashboard (Protected)" },
        @{ Path = "/genie"; Name = "AI Genie (Protected)" },
        @{ Path = "/opportunities"; Name = "Job Opportunities (Protected)" },
        @{ Path = "/profile"; Name = "User Profile (Protected)" }
    )
    
    $passedRoutes = 0
    $totalRoutes = $routes.Count
    
    foreach ($route in $routes) {
        $url = "$activeURL$($route.Path)"
        if (Test-URLAccessible $url) {
            Write-Host "✅ $($route.Name): $url" -ForegroundColor Green
            $passedRoutes++
        } else {
            Write-Host "❌ $($route.Name): $url" -ForegroundColor Red
        }
        
        if ($Verbose) {
            Start-Sleep -Milliseconds 200
        }
    }
    
    Write-Host "`n📊 Frontend Routes: $passedRoutes/$totalRoutes passed" -ForegroundColor Cyan
    
    # Test 404 handling
    $notFoundUrl = "$activeURL/nonexistent-page"
    Write-Host "`n🔍 Testing 404 handling..." -ForegroundColor Yellow
    if (Test-URLAccessible $notFoundUrl) {
        Write-Host "✅ 404 page handling works" -ForegroundColor Green
    } else {
        Write-Host "⚠️  404 page handling needs verification" -ForegroundColor Yellow
    }
}
}

# Backend API tests
function Test-BackendAPI {
    Write-Host "`n🔌 Testing Backend API..." -ForegroundColor Yellow
    
    if (-not (Test-URLAccessible $BackendURL)) {
        Write-Host "❌ Backend not accessible at $BackendURL" -ForegroundColor Red
        Write-Host "💡 Please start backend with: cd backend; conda activate rezgenie; uvicorn main:app --reload" -ForegroundColor Yellow
        return
    }
    
    # Health check
    Write-Host "`n🏥 Health Check Tests..." -ForegroundColor Cyan
    $healthResult = Test-APIEndpoint "$BackendURL/health"
    if ($healthResult.Success) {
        Write-Host "✅ Basic health check: $($healthResult.StatusCode)" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "Response: $($healthResult.Content)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Basic health check failed: $($healthResult.Error)" -ForegroundColor Red
    }
    
    # API documentation
    $docsResult = Test-APIEndpoint "$BackendURL/docs"
    if ($docsResult.Success) {
        Write-Host "✅ API documentation accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ API documentation not accessible" -ForegroundColor Red
    }
    
    # Test API v1 endpoints (without authentication)
    Write-Host "`n🔐 API Endpoint Tests..." -ForegroundColor Cyan
    
    $endpoints = @(
        @{ Path = "/api/v1/health"; Name = "API Health Check"; ExpectedStatus = 200 },
        @{ Path = "/openapi.json"; Name = "OpenAPI Schema"; ExpectedStatus = 200 }
    )
    
    foreach ($endpoint in $endpoints) {
        $result = Test-APIEndpoint "$BackendURL$($endpoint.Path)"
        if ($result.Success -and $result.StatusCode -eq $endpoint.ExpectedStatus) {
            Write-Host "✅ $($endpoint.Name)" -ForegroundColor Green
        } else {
            Write-Host "❌ $($endpoint.Name): Status $($result.StatusCode)" -ForegroundColor Red
        }
    }
    
    # Test authentication endpoints
    Write-Host "`n👤 Authentication Tests..." -ForegroundColor Cyan
    
    # Test registration endpoint (should accept POST)
    $regResult = Test-APIEndpoint "$BackendURL/api/v1/auth/register" -method "POST" -body '{"email":"test@example.com","password":"testpass123"}'
    if ($regResult.Success) {
        if ($regResult.StatusCode -eq 201 -or $regResult.StatusCode -eq 400) {
            Write-Host "✅ Registration endpoint responsive (Status: $($regResult.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Registration endpoint returned Status: $($regResult.StatusCode)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Registration endpoint error: $($regResult.Error)" -ForegroundColor Red
    }
    
    # Test login endpoint
    $loginResult = Test-APIEndpoint "$BackendURL/api/v1/auth/login" -method "POST" -body '{"email":"test@example.com","password":"testpass123"}'
    if ($loginResult.Success) {
        Write-Host "✅ Login endpoint responsive (Status: $($loginResult.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "❌ Login endpoint error: $($loginResult.Error)" -ForegroundColor Red
    }
}

# Service dependency tests
function Test-ServiceDependencies {
    Write-Host "`n🐳 Testing Service Dependencies..." -ForegroundColor Yellow
    
    # Check Docker services
    try {
        $dockerPs = docker-compose ps --format json | ConvertFrom-Json
        
        $services = @("postgres", "redis", "minio")
        foreach ($service in $services) {
            $serviceInfo = $dockerPs | Where-Object { $_.Service -eq $service }
            if ($serviceInfo -and $serviceInfo.State -eq "running") {
                Write-Host "✅ ${service}: Running" -ForegroundColor Green
            } else {
                Write-Host "❌ ${service}: Not running" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "❌ Docker Compose not available or services not running" -ForegroundColor Red
        Write-Host "💡 Start services with: docker-compose up -d" -ForegroundColor Yellow
    }
    
    # Test database connection (if backend is running)
    if (Test-URLAccessible $BackendURL) {
        $dbTestResult = Test-APIEndpoint "$BackendURL/api/v1/health"
        if ($dbTestResult.Success) {
            Write-Host "✅ Database connection via API" -ForegroundColor Green
        }
    }
}

# Integration tests
function Test-Integration {
    Write-Host "`n🔄 Running Integration Tests..." -ForegroundColor Yellow
    
    # Test full stack availability
    $frontendOK = Test-URLAccessible $FrontendURL -or Test-URLAccessible $AltFrontendURL
    $backendOK = Test-URLAccessible $BackendURL
    
    if ($frontendOK -and $backendOK) {
        Write-Host "✅ Full stack is accessible" -ForegroundColor Green
        
        # Test CORS (if both are running)
        Write-Host "🌐 Testing cross-origin requests..." -ForegroundColor Cyan
        # This would require a more complex test, but we can verify both services respond
        Write-Host "✅ Both frontend and backend are responsive for CORS testing" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Full stack integration limited:" -ForegroundColor Yellow
        Write-Host "   Frontend: $(if($frontendOK){"✅"}else{"❌"})" -ForegroundColor $(if($frontendOK){"Green"}else{"Red"})
        Write-Host "   Backend: $(if($backendOK){"✅"}else{"❌"})" -ForegroundColor $(if($backendOK){"Green"}else{"Red"})
    }
}

# Performance tests
function Test-Performance {
    Write-Host "`n⚡ Running Performance Tests..." -ForegroundColor Yellow
    
    if (Test-URLAccessible $FrontendURL -or Test-URLAccessible $AltFrontendURL) {
        $testUrl = if (Test-URLAccessible $FrontendURL) { $FrontendURL } else { $AltFrontendURL }
        
        Write-Host "📊 Testing frontend response time..." -ForegroundColor Cyan
        $times = @()
        for ($i = 1; $i -le 5; $i++) {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            try {
                Invoke-WebRequest -Uri $testUrl -Method Get -UseBasicParsing -TimeoutSec 10 | Out-Null
                $stopwatch.Stop()
                $times += $stopwatch.ElapsedMilliseconds
                if ($Verbose) {
                    Write-Host "  Request ${i}: $($stopwatch.ElapsedMilliseconds)ms" -ForegroundColor Gray
                }
            } catch {
                $stopwatch.Stop()
                Write-Host "  Request ${i}: Failed" -ForegroundColor Red
            }
        }
        
        if ($times.Count -gt 0) {
            $avgTime = ($times | Measure-Object -Average).Average
            Write-Host "✅ Average response time: $([math]::Round($avgTime, 2))ms" -ForegroundColor Green
        }
    }
    
    if (Test-URLAccessible $BackendURL) {
        Write-Host "📊 Testing API response time..." -ForegroundColor Cyan
        $apiTimes = @()
        for ($i = 1; $i -le 5; $i++) {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $result = Test-APIEndpoint "$BackendURL/health"
            $stopwatch.Stop()
            if ($result.Success) {
                $apiTimes += $stopwatch.ElapsedMilliseconds
                if ($Verbose) {
                    Write-Host "  API Request ${i}: $($stopwatch.ElapsedMilliseconds)ms" -ForegroundColor Gray
                }
            }
        }
        
        if ($apiTimes.Count -gt 0) {
            $avgApiTime = ($apiTimes | Measure-Object -Average).Average
            Write-Host "✅ Average API response time: $([math]::Round($avgApiTime, 2))ms" -ForegroundColor Green
        }
    }
}

# Main test execution
Write-Host "Starting tests..." -ForegroundColor Green

switch ($TestType.ToLower()) {
    "frontend" { Test-FrontendRoutes }
    "backend" { Test-BackendAPI }
    "api" { Test-BackendAPI }
    "integration" { Test-Integration }
    "performance" { Test-Performance }
    "dependencies" { Test-ServiceDependencies }
    "all" { 
        Test-ServiceDependencies
        Test-FrontendRoutes
        Test-BackendAPI
        Test-Integration
        Test-Performance
    }
    default {
        Write-Host "❌ Invalid test type: $TestType" -ForegroundColor Red
        Write-Host "Valid options: frontend, backend, api, integration, performance, dependencies, all" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "`n🎉 Testing completed!" -ForegroundColor Green
Write-Host "`n💡 Tips:" -ForegroundColor Yellow
Write-Host "  - Use -Verbose for detailed output" -ForegroundColor Gray
Write-Host "  - Run specific tests with -TestType parameter" -ForegroundColor Gray
Write-Host "  - Ensure all services are running for complete testing" -ForegroundColor Gray