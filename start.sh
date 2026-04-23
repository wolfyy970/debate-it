#!/bin/bash

# Debater Startup Script
# Usage: ./start.sh [dev|prod]

MODE=${1:-dev}
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🎯 Starting Debater...${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Copying from example.env...${NC}"
    cp example.env .env
    echo -e "${YELLOW}   Please edit .env and add your API keys.${NC}"
fi

# Create logs directory
mkdir -p logs

# Ports for status messages (defaults match server/lib/constants.ts; override in .env)
API_PORT=38471
APP_PORT=52817
if [ -f .env ]; then
  _p=$(grep -E '^PORT=' .env | head -1 | cut -d= -f2- | tr -d ' \r"' | tr -d "'")
  _v=$(grep -E '^VITE_DEV_PORT=' .env | head -1 | cut -d= -f2- | tr -d ' \r"' | tr -d "'")
  [ -n "$_p" ] && API_PORT="$_p"
  [ -n "$_v" ] && APP_PORT="$_v"
fi

# Kill existing processes
pkill -f "tsx server" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

if [ "$MODE" = "dev" ]; then
    echo -e "${GREEN}📦 Building client...${NC}"
    npm run build
    
    echo -e "${GREEN}🚀 Starting server...${NC}"
    npm run server &
    SERVER_PID=$!
    
    sleep 2
    
    echo -e "${GREEN}🌐 Starting client dev server...${NC}"
    npm run dev &
    CLIENT_PID=$!
    
    echo ""
    echo -e "${GREEN}✅ Debater is running!${NC}"
    echo -e "   API: http://localhost:${API_PORT}"
    echo -e "   App: http://localhost:${APP_PORT}"
    echo -e "   Health: http://localhost:${API_PORT}/health"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    
    # Wait for interrupt
    trap "echo ''; echo -e '${RED}Stopping...${NC}'; kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit 0" INT
    wait
    
elif [ "$MODE" = "prod" ]; then
    echo -e "${GREEN}📦 Building for production...${NC}"
    npm run build
    
    echo -e "${GREEN}🚀 Starting in production mode...${NC}"
    NODE_ENV=production npm run server:prod &
    SERVER_PID=$!
    
    echo -e "${GREEN}🌐 Starting preview server...${NC}"
    npm run preview &
    CLIENT_PID=$!
    
    echo ""
    echo -e "${GREEN}✅ Debater is running in production mode!${NC}"
    echo -e "   API: http://localhost:${API_PORT}"
    echo -e "   App: http://localhost:${APP_PORT}"
    echo -e "   Health: http://localhost:${API_PORT}/health"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    
    trap "echo ''; echo -e '${RED}Stopping...${NC}'; kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit 0" INT
    wait
    
elif [ "$MODE" = "pm2" ]; then
    echo -e "${GREEN}🚀 Starting with PM2...${NC}"
    npm run start:pm2
    
    echo ""
    echo -e "${GREEN}✅ Debater is running with PM2!${NC}"
    echo -e "   Check status: pm2 status"
    echo -e "   View logs: pm2 logs"
    echo -e "   Stop: npm run stop:pm2"
    
else
    echo -e "${RED}Unknown mode: $MODE${NC}"
    echo "Usage: ./start.sh [dev|prod|pm2]"
    exit 1
fi