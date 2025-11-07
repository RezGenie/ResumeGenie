#!/bin/bash

# RezGenie Frontend Testing Script
# This script helps automate frontend testing tasks

echo "🧞‍♂️ RezGenie Frontend Testing Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Frontend directory not found!${NC}"
    exit 1
fi

cd frontend

echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
fi

echo ""
echo "🔍 Running Tests..."
echo ""

# 1. Check for TypeScript errors
echo "1️⃣  Checking TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    echo "Run 'npm run build' to see detailed errors"
fi

echo ""

# 2. Check for linting issues
echo "2️⃣  Running ESLint..."
if npm run lint > /dev/null 2>&1; then
    echo -e "${GREEN}✅ No linting errors${NC}"
else
    echo -e "${YELLOW}⚠️  Linting warnings found${NC}"
    echo "Run 'npm run lint' to see details"
fi

echo ""

# 3. Check for unused dependencies
echo "3️⃣  Checking for unused dependencies..."
if command -v depcheck &> /dev/null; then
    depcheck --ignores="@types/*,eslint-*,prettier,typescript"
else
    echo -e "${YELLOW}⚠️  depcheck not installed. Install with: npm install -g depcheck${NC}"
fi

echo ""

# 4. Check bundle size
echo "4️⃣  Analyzing bundle size..."
if [ -d ".next" ]; then
    echo "Build artifacts found. Checking sizes..."
    du -sh .next/static/chunks/* 2>/dev/null | head -10
else
    echo -e "${YELLOW}⚠️  No build artifacts found. Run 'npm run build' first${NC}"
fi

echo ""

# 5. Check for console.log statements (should be removed in production)
echo "5️⃣  Checking for console.log statements..."
CONSOLE_LOGS=$(grep -r "console.log" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$CONSOLE_LOGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $CONSOLE_LOGS console.log statements${NC}"
    echo "Consider removing them for production"
else
    echo -e "${GREEN}✅ No console.log statements found${NC}"
fi

echo ""

# 6. Check for TODO comments
echo "6️⃣  Checking for TODO comments..."
TODO_COUNT=$(grep -r "TODO" src/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO comments${NC}"
    grep -r "TODO" src/ --include="*.tsx" --include="*.ts" | head -5
else
    echo -e "${GREEN}✅ No TODO comments found${NC}"
fi

echo ""

# 7. Check for accessibility issues (if @axe-core/react is installed)
echo "7️⃣  Accessibility check..."
if grep -q "@axe-core/react" package.json; then
    echo -e "${GREEN}✅ Axe-core is installed for accessibility testing${NC}"
else
    echo -e "${YELLOW}⚠️  Consider installing @axe-core/react for accessibility testing${NC}"
fi

echo ""

# 8. Security audit
echo "8️⃣  Running security audit..."
npm audit --production 2>&1 | grep -E "found|vulnerabilities" || echo -e "${GREEN}✅ No security vulnerabilities found${NC}"

echo ""
echo "======================================"
echo "✨ Frontend testing checks complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Start dev server: npm run dev"
echo "  2. Run manual tests from TESTING_PLAN.md"
echo "  3. Test on different browsers and devices"
echo "  4. Check responsive design at various breakpoints"
echo ""
