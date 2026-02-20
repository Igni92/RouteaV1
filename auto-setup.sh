#!/bin/bash
echo "🚀 AUTO-SETUP FLEET MANAGEMENT APP"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}📦 Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found${NC}"
  echo "Install from: https://nodejs.org/"
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check if .env files exist and have Supabase keys
echo ""
echo -e "${BLUE}🔑 Checking .env files...${NC}"
if ! grep -q "SUPABASE_URL=https://" backend/.env 2>/dev/null; then
  echo -e "${RED}❌ backend/.env missing SUPABASE_URL${NC}"
  echo "Follow the SUPABASE_SETUP.md guide first!"
  exit 1
fi
echo -e "${GREEN}✅ .env files configured${NC}"

# Install backend
echo ""
echo -e "${BLUE}📦 Installing backend...${NC}"
cd backend
npm install --legacy-peer-deps
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
  echo -e "${RED}❌ Backend install failed${NC}"
  exit 1
fi
cd ..

# Install frontend
echo ""
echo -e "${BLUE}📦 Installing frontend-manager...${NC}"
cd frontend-manager
npm install --legacy-peer-deps
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
  echo -e "${RED}❌ Frontend install failed${NC}"
  exit 1
fi
cd ..

# Install driver app
echo ""
echo -e "${BLUE}📦 Installing app-driver...${NC}"
cd app-driver
npm install --legacy-peer-deps
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Driver app dependencies installed${NC}"
else
  echo -e "${RED}❌ Driver app install failed${NC}"
  exit 1
fi
cd ..

echo ""
echo -e "${GREEN}✅ ALL INSTALLED!${NC}"
echo ""
echo "Next steps:"
echo "1. Run database migrations: cd backend && npm run migrate"
echo "2. Start backend: cd backend && npm run dev"
echo "3. Start frontend: cd frontend-manager && npm run dev"
echo "4. Start driver app: cd app-driver && npx expo start"
