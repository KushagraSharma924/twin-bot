#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage information
show_usage() {
  echo -e "${BLUE}Usage:${NC} $0 [start|stop|status|test]"
  echo "Commands:"
  echo "  start  - Start Ollama server and Nginx reverse proxy"
  echo "  stop   - Stop Ollama server and Nginx reverse proxy"
  echo "  status - Check status of Ollama and Nginx services"
  echo "  test   - Run test script to verify setup"
}

# Function to start services
start_services() {
  echo -e "${BLUE}Starting Ollama service...${NC}"
  
  # Check if Ollama is already running
  if pgrep -x "ollama" > /dev/null; then
    echo -e "${YELLOW}Ollama is already running${NC}"
  else
    # Start Ollama in the background
    ollama serve &
    echo -e "${GREEN}Ollama started${NC}"
    # Give it a moment to initialize
    sleep 2
  fi
  
  echo -e "${BLUE}Starting Nginx reverse proxy...${NC}"
  brew services start nginx
  echo -e "${GREEN}Nginx started${NC}"
  
  echo -e "\n${GREEN}✅ All services are running${NC}"
  echo -e "Ollama is available at: ${YELLOW}http://localhost:11434${NC}"
  echo -e "Nginx proxy is available at: ${YELLOW}http://localhost:8081/ollama${NC}"
  echo -e "\nTo test the setup, run: ${YELLOW}$0 test${NC}"
}

# Function to stop services
stop_services() {
  echo -e "${BLUE}Stopping Nginx reverse proxy...${NC}"
  brew services stop nginx
  echo -e "${GREEN}Nginx stopped${NC}"
  
  echo -e "${BLUE}Stopping Ollama service...${NC}"
  pkill -f "ollama serve" || echo -e "${YELLOW}Ollama was not running${NC}"
  echo -e "${GREEN}Ollama stopped${NC}"
  
  echo -e "\n${GREEN}✅ All services have been stopped${NC}"
}

# Function to check service status
check_status() {
  echo -e "${BLUE}Checking Ollama status...${NC}"
  if pgrep -x "ollama" > /dev/null; then
    echo -e "${GREEN}Ollama is running${NC}"
    echo -e "Ollama API: ${YELLOW}http://localhost:11434${NC}"
  else
    echo -e "${RED}❌ Ollama is not running${NC}"
  fi
  
  echo -e "\n${BLUE}Checking Nginx status...${NC}"
  if brew services info nginx | grep -q "Running: true"; then
    echo -e "${GREEN}Nginx is running${NC}"
    echo -e "Nginx proxy: ${YELLOW}http://localhost:8081/ollama${NC}"
  else
    echo -e "${RED}❌ Nginx is not running${NC}"
  fi
  
  echo -e "\n${BLUE}Testing connection to Ollama through Nginx proxy...${NC}"
  if curl -s http://localhost:8081/ollama/api/tags > /dev/null; then
    echo -e "${GREEN}✅ Ollama is accessible through Nginx proxy${NC}"
  else
    echo -e "${RED}❌ Cannot access Ollama through Nginx proxy${NC}"
  fi
}

# Function to run the test script
run_test() {
  echo -e "${BLUE}Running Ollama proxy test script...${NC}"
  node test-ollama-proxy.js
}

# Main script logic
case "$1" in
  start)
    start_services
    ;;
  stop)
    stop_services
    ;;
  status)
    check_status
    ;;
  test)
    run_test
    ;;
  *)
    show_usage
    exit 1
    ;;
esac

exit 0 