# AI Image Editor API

A FastAPI server that provides chat endpoints for the AI Image Editor application.

## Structure

```
api/
├── server/
│   └── main.py          # FastAPI server with chat endpoints
├── llm/                 # LLM-related modules (for future use)
├── pyproject.toml       # Dependencies and project configuration
└── README.md           # This file
```

## Features

- **Chat Endpoint**: `/chat` - Main chat endpoint with full context
- **Health Check**: `/health` - Server health monitoring
- **Template Responses**: Context-aware template responses

## Endpoints

### POST `/chat`

Main chat endpoint that accepts:

- `message`: User's message
- `selected_images`: List of selected image IDs
- `user_id`: Optional user identifier

### GET `/health`

Health check endpoint

## Running the Server

```bash
# Install dependencies
pip install -e .

# Run the server
cd server
python main.py

# Or with uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Development

The project uses:

- **FastAPI** for the web framework
- **Pydantic** for data validation
- **Uvicorn** for ASGI server
- **Ruff** for linting and formatting
- **Black** for code formatting
- **MyPy** for type checking

## Deployment

This server is designed to be deployed on Hugging Face Spaces as an API endpoint.

## Response Format

```json
{
  "response": "AI response message",
  "status": "success"
}
```
