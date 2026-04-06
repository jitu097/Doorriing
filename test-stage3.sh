#!/bin/bash

# ============================================
# Stage 3 Frontend Optimization - Quick Test  
# ============================================
# This script tests all Stage 3 improvements
# Time: 5-10 minutes
# ============================================

cd "c:\Users\kushk\Desktop\BazarSe_User\frontend" || exit 1

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  STAGE 3: FRONTEND BUNDLE OPTIMIZATION - TEST SUITE  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check Node
echo "[1/3] Checking Node.js..."
node --version
if [ $? -ne 0 ]; then
    echo "ERROR: Node.js not found"
    exit 1
fi
echo "✓ Node.js detected"
echo ""

# Step 2: Install dependencies if needed
echo "[2/3] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install --silent
else
    echo "✓ Dependencies already installed"
fi
echo ""

# Step 3: Build and create visualizer
echo "[3/3] Building optimized frontend..."
echo ""
echo "This will:"
echo " • Compile frontend with code splitting"
echo " • Create chunk-*.js files (one per feature)"
echo " • Generate visualizer (opens automatically)"
echo " • Show bundle breakdown"
echo ""
npm run build

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║               ✓ BUILD COMPLETE                        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Check these files in dist/:"
echo " □ index-*.js (80-100 KB) - Initial app"
echo " □ chunk-auth-*.js - Authentication pages"
echo " □ chunk-shopping-*.js - Shopping pages"
echo " □ chunk-orders-*.js - Order pages"
echo " □ vendor-react-*.js - React libraries"
echo " □ vendor-ui-*.js - UI libraries"
echo " □ stats.html - Bundle analyzer"
echo ""

# Show dist folder contents
echo "Bundle contents:"
ls -lh dist/*.js 2>/dev/null | awk '{print $9, "(" $5 ")"}'

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        WHAT TO DO NEXT                               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "1. Start development server:"
echo "   → npm run dev"
echo ""
echo "2. Open DevTools (F12) on http://localhost:5173"
echo ""
echo "3. Go to Network tab and hard refresh (Ctrl+Shift+R)"
echo ""
echo "4. Watch multiple JS files load (code splitting works!)"
echo ""
echo "Read verification guide for detailed steps:"
echo "→ STAGE3_VERIFICATION_GUIDE.md"
echo ""
