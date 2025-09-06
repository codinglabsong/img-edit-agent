---
title: Img Edit Agent API
emoji: 🖼️
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# AI Image Editor API

FastAPI service powering the Img Edit Agent web app. It provides chat-driven image editing and generation.

## Features

- **POST `/chat`** – Send a message and optional image metadata; receives an AI reply with optional generated image details.
- **GET `/health`** – Reports service and database status.
- **Rate limiting & startup hooks** – Initializes a rate-limit table on startup and logs shutdown events.
- **Modular LLM tools** – Uses the `llm` package for agent logic, database connections, and utilities.

## Project Structure

```
api/
├── server/         # FastAPI application
├── llm/            # LLM agent and helpers
├── tests/          # pytest suite
├── Dockerfile      # Container build
└── README.md
```

## Running Locally

```bash
pip install -e .[dev]
uvicorn server.main:app --host 0.0.0.0 --port 8000
```

## API Reference

### POST `/chat`

Request body:

```json
{
  "message": "Describe edit",
  "selected_images": [{ "id": "...", "url": "..." }],
  "user_id": "optional"
}
```

Response:

```json
{
  "response": "AI response",
  "status": "success",
  "generated_image": { "id": "...", "url": "..." }
}
```

### GET `/health`

Returns service and database status.

## Deployment

This API is built to run as a Docker container on [Hugging Face Spaces](https://huggingface.co/spaces).
