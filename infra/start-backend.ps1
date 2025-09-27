# Start Backend Server Script
# Ensures uvicorn runs from the correct directory

$ErrorActionPreference = "Stop"

Write-Host "Starting RezGenie Backend Server..." -ForegroundColor Green

# Get script directory and set backend path
$BackendPath = "c:\Users\salih\Desktop\projects\RezGenie\backend"
$CondaEnvPath = "C:\Users\salih\anaconda3\envs\rezgenie"

# Check if backend directory exists
if (-not (Test-Path $BackendPath)) {
    Write-Host "Error: Backend directory not found at $BackendPath" -ForegroundColor Red
    exit 1
}

# Check if conda environment exists
if (-not (Test-Path "$CondaEnvPath\Scripts\uvicorn.exe")) {
    Write-Host "Error: Conda environment 'rezgenie' not found or uvicorn not installed" -ForegroundColor Red
    Write-Host "Please run: conda activate rezgenie && pip install uvicorn" -ForegroundColor Yellow
    exit 1
}

# Change to backend directory
Set-Location $BackendPath
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Cyan

# Start uvicorn server
Write-Host "Starting uvicorn server on http://localhost:8000..." -ForegroundColor Yellow
& "$CondaEnvPath\Scripts\uvicorn.exe" main:app --reload --host 0.0.0.0 --port 8000