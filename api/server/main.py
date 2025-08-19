from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

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


# Template responses for different types of messages
TEMPLATE_RESPONSES = {
    "greeting": [
        "Hello! I'm your AI image editing assistant. How can I help you today?",
        "Hi there! What would you like to work on?",
        "Welcome! I'm your AI assistant ready to help you transform your images.",
    ],
    "image_selection": [
        "I can see you've selected some images. What would you like to do with them?",
        "Great choice! Those images look interesting. What kind of editing you need?",
        "Perfect! I can help you edit those selected images. What's your vision?",
    ],
    "editing_request": [
        "I understand you want to edit your images. Let me help you with that!",
        "Great! I can assist you with image editing. What specific changes you need?",
        "Excellent! I'm ready to help you transform your images.",
    ],
    "general_help": [
        "Just let me know what you'd like to do!",
        "Feel free to ask me anything about image editing.",
    ],
    "upload": [
        "I see you've uploaded an image! What would you like to do with it?",
        "Great! I can help you edit that uploaded image.",
        "Perfect! I'm ready to work with your uploaded image. What's your vision?",
    ],
}


def get_template_response(
    message: str, selected_images: Optional[List[str]] = None
) -> str:
    """Get a template response based on the message content and context."""
    message_lower = message.lower()

    # Check for greetings
    if any(word in message_lower for word in ["hello", "hi", "hey", "greetings"]):
        import random

        return random.choice(TEMPLATE_RESPONSES["greeting"])

    # Check for image uploads
    if "uploaded" in message_lower or "📷" in message:
        import random

        return random.choice(TEMPLATE_RESPONSES["upload"])

    # Check for image selection context
    if selected_images and len(selected_images) > 0:
        import random

        base_response = random.choice(TEMPLATE_RESPONSES["image_selection"])
        image_names = ", ".join(selected_images)
        return f"{base_response} I can see you've selected: {image_names}."

    # Check for editing requests
    if any(
        word in message_lower
        for word in [
            "edit",
            "change",
            "modify",
            "transform",
            "enhance",
            "filter",
            "effect",
        ]
    ):
        import random

        return random.choice(TEMPLATE_RESPONSES["editing_request"])

    # Default response
    import random

    return random.choice(TEMPLATE_RESPONSES["general_help"])


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
        ChatResponse with AI response and status
    """
    try:
        # Get template response based on message and context
        response = get_template_response(request.message, request.selected_images)

        return ChatResponse(response=response, status="success")

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing request: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
