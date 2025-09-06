# Img Edit Agent

Img Edit Agent lets you transform images through a conversational interface. The project combines a Next.js front-end with a FastAPI backend deployed on Hugging Face Spaces.

## Features

- **Chat-based image editing** – Converse with an AI assistant to generate and refine images.
- **Upload & gallery** – Upload your own photos, pick from sample images, and select multiple references.
- **Prompt refinement** – The assistant rewrites your prompt for better results.
- **FastAPI backend** – The web app calls the API for LLM-driven processing and image generation.
- **Health monitoring** – Backend exposes a `/health` endpoint with database status.
- **Developer tooling** – Prettier, ESLint, Ruff, and pytest keep the codebase consistent.

## Project Structure

```
.
├── src/                # Next.js app
├── api/                # FastAPI server (see api/README.md)
├── public/             # Static assets
└── ...
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install & run the web app

```bash
pnpm install
pnpm dev
```

The front-end expects the API to be running or accessible. To launch the API locally:

```bash
cd api
pip install -e .[dev]
uvicorn server.main:app --host 0.0.0.0 --port 8000
```

See [`api/README.md`](api/README.md) for detailed backend instructions.

## Learn More

- [Next.js documentation](https://nextjs.org/docs) – learn about the framework.
- [FastAPI documentation](https://fastapi.tiangolo.com/) – explore the backend framework.
