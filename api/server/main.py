import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from llm.agent import chat_with_agent
from llm.connection_manager import _test_connection, get_checkpointer
from llm.utils import create_rate_limits_table


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI app startup and shutdown."""
    # Startup
    create_rate_limits_table()
    yield
    # Shutdown (if needed)
    print("[FASTAPI] App shutting down...")


app = FastAPI(
    title="AI Image Editor API",
    description="API for AI-powered image editing assistant",
    version="1.0.0",
    lifespan=lifespan,
)


class ChatRequest(BaseModel):
    message: str
    selected_images: Optional[List[Dict[str, str]]] = []
    user_id: Optional[str] = None
    client_ip: str | None = None


class GeneratedImage(BaseModel):
    id: str
    url: str
    title: str
    description: str
    timestamp: str
    type: str = "generated"


class ChatResponse(BaseModel):
    response: str
    status: str = "success"
    generated_image: Optional[GeneratedImage] = None


@app.get("/")
async def root():
    return {"message": "AI Image Editor API is running!"}


@app.get("/health")
async def health_check():
    """Enhanced health check that includes database connection status."""
    try:
        # Test database connection
        checkpointer = get_checkpointer()
        db_healthy = _test_connection(checkpointer)

        return {
            "status": "healthy" if db_healthy else "degraded",
            "service": "ai-image-editor-api",
            "database": {"status": "connected" if db_healthy else "disconnected", "timestamp": time.time()},
        }
    except Exception as e:
        return {"status": "unhealthy", "service": "ai-image-editor-api", "database": {"status": "error", "error": str(e), "timestamp": time.time()}}


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Chat endpoint that receives user messages and returns AI responses.

    Args:
        request: ChatRequest containing message, selected_images, and user_id

    Returns:
        ChatResponse with AI response, status, and optional generated image metadata.
    """
    try:
        # Extract client IP
        print(request)
        client_ip = request.client_ip or "unknown"
        if client_ip == "unknown":
            return ChatResponse(response="Error: Client IP not found", status="error")
        print(f"[FASTAPI] Client IP: {client_ip}")

        # Use the LLM agent to get a response
        user_id = request.user_id or "default"
        response, generated_image_data = chat_with_agent(
            message=request.message,
            client_ip=client_ip,
            user_id=user_id,
            selected_images=request.selected_images,
        )

        # Create response with optional generated image
        chat_response = ChatResponse(response=response, status="success")

        if generated_image_data:
            chat_response.generated_image = GeneratedImage(**generated_image_data)

        return chat_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
