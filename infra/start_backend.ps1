# Start RezGenie Backend Server
Write-Host "🚀 Starting RezGenie Backend Server..." -ForegroundColor Green

# Navigate to backend directory
Set-Location "c:\Users\salih\Desktop\projects\RezGenie\backend"

# Verify we're in the right location
Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host "📄 Checking for main.py..." -ForegroundColor Cyan

if (Test-Path "main.py") {
    Write-Host "✅ Found main.py" -ForegroundColor Green
    
    Write-Host "🔄 Starting FastAPI server..." -ForegroundColor Yellow
    Write-Host "🌐 Backend will be available at: http://localhost:8000" -ForegroundColor Cyan
    Write-Host "📖 API documentation: http://localhost:8000/docs" -ForegroundColor Cyan
    Write-Host "" 
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    
    # Start the server
    C:\Users\salih\anaconda3\envs\rezgenie\Scripts\uvicorn.exe main:app --reload --host 0.0.0.0 --port 8000
}
else {
    Write-Host "❌ main.py not found in current directory" -ForegroundColor Red
    Write-Host "Current files:" -ForegroundColor Yellow
    Get-ChildItem
}