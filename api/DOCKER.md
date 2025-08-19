# Docker Setup

This directory contains Docker configuration for running the AI Image Editor API.

## Quick Start

### Production Mode (Default)

```bash
# Start in production mode
./run.sh prod

# Or directly with docker-compose
docker-compose up --build
```

### Development Mode

```bash
# Start in development mode with live reloading
./run.sh dev

# Or directly with docker-compose
docker-compose -f docker-compose.dev.yml up --build
```

## Files

- `Dockerfile` - Production-ready Docker image
- `docker-compose.yml` - Production configuration
- `docker-compose.dev.yml` - Development configuration with volume mounts
- `run.sh` - Convenient script to switch between modes

## Features

### Production Mode

- Optimized for production deployment
- No volume mounts (code is baked into image)
- Health checks enabled
- Automatic restarts

### Development Mode

- Live code reloading (volume mounts)
- Excluded cache directories
- Same health checks and networking
- Easy debugging

## Commands

```bash
# Start services
./run.sh prod    # Production
./run.sh dev     # Development

# Stop services
docker-compose down

# View logs
docker-compose logs -f api

# Rebuild and start
docker-compose up --build

# Access the API
curl http://localhost:7860/health
```

## Environment Variables

- `PORT` - API port (default: 7860)
- `PYTHONPATH` - Python path (set in dev mode)

## Health Check

The API includes a health endpoint at `/health` that returns:

```json
{
  "status": "healthy",
  "service": "ai-image-editor-api"
}
```
