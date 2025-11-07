#!/bin/bash

# RezGenie Backend Testing Script
# This script helps automate backend testing tasks

echo "🧞‍♂️ RezGenie Backend Testing Suite"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ Backend directory not found!${NC}"
    exit 1
fi

cd backend

echo "📦 Checking Python environment..."
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found${NC}"
    echo "Create one with: python -m venv venv"
    echo "Activate with: source venv/bin/activate (Linux/Mac) or venv\\Scripts\\activate (Windows)"
fi

echo ""
echo "🔍 Running Tests..."
echo ""

# 1. Check Python version
echo "1️⃣  Checking Python version..."
PYTHON_VERSION=$(python --version 2>&1)
echo -e "${BLUE}$PYTHON_VERSION${NC}"
if python -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"; then
    echo -e "${GREEN}✅ Python version is compatible${NC}"
else
    echo -e "${RED}❌ Python 3.8+ required${NC}"
fi

echo ""

# 2. Check dependencies
echo "2️⃣  Checking dependencies..."
if [ -f "requirements.txt" ]; then
    echo "Found requirements.txt"
    MISSING_DEPS=$(pip list --format=freeze | grep -v -f <(cat requirements.txt | grep -v "^#" | cut -d'=' -f1) | wc -l)
    if [ "$MISSING_DEPS" -eq 0 ]; then
        echo -e "${GREEN}✅ All dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Some dependencies might be missing${NC}"
        echo "Run: pip install -r requirements.txt"
    fi
else
    echo -e "${YELLOW}⚠️  requirements.txt not found${NC}"
fi

echo ""

# 3. Check for Python syntax errors
echo "3️⃣  Checking Python syntax..."
SYNTAX_ERRORS=0
for file in $(find . -name "*.py" -not -path "./venv/*" -not -path "./.venv/*"); do
    if ! python -m py_compile "$file" 2>/dev/null; then
        echo -e "${RED}❌ Syntax error in: $file${NC}"
        SYNTAX_ERRORS=$((SYNTAX_ERRORS + 1))
    fi
done

if [ "$SYNTAX_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✅ No syntax errors found${NC}"
else
    echo -e "${RED}❌ Found $SYNTAX_ERRORS files with syntax errors${NC}"
fi

echo ""

# 4. Check for code style (if flake8 is installed)
echo "4️⃣  Checking code style..."
if command -v flake8 &> /dev/null; then
    flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
    echo -e "${GREEN}✅ Flake8 check complete${NC}"
else
    echo -e "${YELLOW}⚠️  flake8 not installed. Install with: pip install flake8${NC}"
fi

echo ""

# 5. Check for security issues (if bandit is installed)
echo "5️⃣  Running security scan..."
if command -v bandit &> /dev/null; then
    bandit -r . -ll -i 2>/dev/null | grep -E "Total|High|Medium" || echo -e "${GREEN}✅ No high/medium security issues found${NC}"
else
    echo -e "${YELLOW}⚠️  bandit not installed. Install with: pip install bandit${NC}"
fi

echo ""

# 6. Check database connection
echo "6️⃣  Checking database configuration..."
if [ -f ".env" ]; then
    if grep -q "DATABASE_URL" .env; then
        echo -e "${GREEN}✅ DATABASE_URL configured${NC}"
    else
        echo -e "${YELLOW}⚠️  DATABASE_URL not found in .env${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
fi

echo ""

# 7. Check for TODO comments
echo "7️⃣  Checking for TODO comments..."
TODO_COUNT=$(grep -r "TODO" . --include="*.py" | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO comments${NC}"
    grep -r "TODO" . --include="*.py" | head -5
else
    echo -e "${GREEN}✅ No TODO comments found${NC}"
fi

echo ""

# 8. Check for print statements (should use logging)
echo "8️⃣  Checking for print statements..."
PRINT_COUNT=$(grep -r "print(" . --include="*.py" | grep -v "# print" | wc -l)
if [ "$PRINT_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $PRINT_COUNT print statements${NC}"
    echo "Consider using logging instead"
else
    echo -e "${GREEN}✅ No print statements found${NC}"
fi

echo ""

# 9. Check API documentation
echo "9️⃣  Checking API documentation..."
if [ -f "main.py" ] || [ -f "app/main.py" ]; then
    if grep -q "FastAPI" main.py app/main.py 2>/dev/null; then
        echo -e "${GREEN}✅ FastAPI detected${NC}"
        echo "API docs available at: http://localhost:8000/docs"
    fi
else
    echo -e "${YELLOW}⚠️  Main application file not found${NC}"
fi

echo ""

# 10. Check for environment variables
echo "🔟  Checking required environment variables..."
REQUIRED_VARS=("DATABASE_URL" "SECRET_KEY" "OPENAI_API_KEY")
MISSING_VARS=0

for var in "${REQUIRED_VARS[@]}"; do
    if [ -f ".env" ] && grep -q "^$var=" .env; then
        echo -e "${GREEN}✅ $var is set${NC}"
    else
        echo -e "${RED}❌ $var is missing${NC}"
        MISSING_VARS=$((MISSING_VARS + 1))
    fi
done

if [ "$MISSING_VARS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $MISSING_VARS required environment variables are missing${NC}"
fi

echo ""
echo "====================================="
echo "✨ Backend testing checks complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Start backend server: uvicorn main:app --reload"
echo "  2. Test API endpoints with Postman/Insomnia"
echo "  3. Check API docs at http://localhost:8000/docs"
echo "  4. Run integration tests"
echo ""
