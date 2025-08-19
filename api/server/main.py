from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from llm.agent import chat_with_agent

app = FastAPI(
    title="AI Image Editor API",
    description="API for AI-powered image editing assistant",
    version="1.0.0",
)


class ChatRequest(BaseModel):
    message: str
    selected_images: Optional[List[str]] = []
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    status: str = "success"


@app.get("/")
async def root():
    return {"message": "AI Image Editor API is running!"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-image-editor-api"}


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Chat endpoint that receives user messages and returns AI responses.

    Args:
        request: ChatRequest containing message, selected_images, and user_id

    Returns:
        ChatResponse with AI response and status.
    """
    try:
        # Use the LLM agent to get a response
        user_id = request.user_id or "default"
        response = chat_with_agent(
            message=request.message,
            user_id=user_id,
            selected_images=request.selected_images,
        )

        return ChatResponse(response=response, status="success")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
