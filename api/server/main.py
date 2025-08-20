import logging
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from llm.agent import chat_with_agent

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Image Editor API",
    description="API for AI-powered image editing assistant",
    version="1.0.0",
)


class ChatRequest(BaseModel):
    message: str
    selected_images: Optional[List[Dict[str, str]]] = []
    user_id: Optional[str] = None


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
    logger.info("Root endpoint accessed")
    return {"message": "AI Image Editor API is running!"}


@app.get("/health")
async def health_check():
    logger.info("Health check endpoint accessed")
    return {"status": "healthy", "service": "ai-image-editor-api"}


@app.get("/logs")
async def get_logs():
    """Get recent logs for debugging (development only)"""
    logger.info("Logs endpoint accessed")
    return {
        "message": "Check Hugging Face Space logs for detailed information",
        "logs_url": "https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME/logs",
    }


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
        logger.info(f"Chat request received - user_id: {request.user_id}, message: {request.message[:100]}...")

        # Use the LLM agent to get a response
        user_id = request.user_id or "default"
        response, generated_image_data = chat_with_agent(
            message=request.message,
            user_id=user_id,
            selected_images=request.selected_images,
        )

        logger.info(f"Agent response received - has generated image: {generated_image_data is not None}")

        # Create response with optional generated image
        chat_response = ChatResponse(response=response, status="success")

        if generated_image_data:
            chat_response.generated_image = GeneratedImage(**generated_image_data)
            logger.info(f"Generated image data: {generated_image_data}")

        return chat_response

    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
