#!/bin/bash

# Stage 1 Optimization - Quick Start Guide
# This script helps you test and verify Stage 1 optimizations

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Stage 1: Backend Optimization - Proof of Optimization    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}[1/4] Checking if backend server is running...${NC}"
if curl -s http://localhost:5002/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running on port 5002${NC}"
else
    echo -e "${YELLOW}⚠ Server might not be running. Starting server...${NC}"
    echo "Run this in another terminal:"
    echo "  cd backend"
    echo "  node src/server.js"
    echo ""
    read -p "Press Enter after starting the server..."
fi

echo ""
echo -e "${BLUE}[2/4] Testing compression...${NC}"
# Test compression
RESPONSE_HEADER=$(curl -s -I http://localhost:5002/api/shops -H "Accept-Encoding: gzip" 2>&1)
if echo "$RESPONSE_HEADER" | grep -q "content-encoding"; then
    echo -e "${GREEN}✓ Compression is working${NC}"
    echo "$RESPONSE_HEADER" | grep "content-encoding" || echo "  No content-encoding header"
else
    echo -e "${YELLOW}⚠ Compression might not be applied${NC}"
fi

echo ""
echo -e "${BLUE}[3/4] Testing cache endpoints...${NC}"
# Test cache monitoring endpoint
CACHE_STATS=$(curl -s http://localhost:5002/api/monitoring/cache 2>&1)
if echo "$CACHE_STATS" | grep -q "success"; then
    echo -e "${GREEN}✓ Cache monitoring endpoint working${NC}"
    echo "$CACHE_STATS" | grep -o '"hits":[0-9]*' || echo "  Cannot extract cache stats"
else
    echo -e "${YELLOW}⚠ Cache endpoint not available yet${NC}"
fi

echo ""
echo -e "${BLUE}[4/4] Running performance benchmark...${NC}"
echo "Executing: node src/scripts/benchmark-stage1.js"
echo ""

# Run benchmark
cd src/scripts
node benchmark-stage1.js

exit 0
