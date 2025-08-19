#!/bin/bash

# Script to run the API in production or development mode
# Usage: ./run.sh [prod|dev]

MODE=${1:-prod}

case $MODE in
    "prod"|"production")
        echo "🚀 Starting API in PRODUCTION mode..."
        docker-compose up --build
        ;;
    "dev"|"development")
        echo "🔧 Starting API in DEVELOPMENT mode..."
        docker-compose -f docker-compose.dev.yml up --build
        ;;
    *)
        echo "Usage: $0 [prod|dev]"
        echo "  prod  - Run in production mode (default)"
        echo "  dev   - Run in development mode with live reloading"
        exit 1
        ;;
esac
