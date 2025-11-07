#!/bin/bash

echo "🔥 Running smoke tests..."

# Check frontend loads
curl -f http://localhost:3000 || exit 1

# Check API is alive
curl -f http://localhost:8000/health || exit 1

# Check auth endpoint exists
curl -f http://localhost:8000/auth/login -X POST || exit 1

echo "✅ Smoke tests passed!"