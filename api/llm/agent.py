import logging
import os
from datetime import datetime
from typing import List, Optional

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent

from llm.connection_manager import get_checkpointer
from llm.prompt import system_message
from llm.tools import initialize_tools
from llm.utils import cleanup_old_tool_results, get_tool_result

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global agent instance
_agent_executor = None
# Counter for periodic cleanup
_request_count = 0


def _get_agent(client_ip: str):
    """Get or create the agent instance."""
    global _agent_executor

    if _agent_executor is None:
        # Build LLM
        print("[AGENT] building LLM")
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

        # Build tools
        print("[AGENT] initializing tools")
        tools = initialize_tools(client_ip)

        # Create agent with fresh checkpointer
        print("[AGENT] creating agent")
        _agent_executor = create_react_agent(
            llm,
            tools=tools,
            prompt=system_message,
            checkpointer=get_checkpointer(),
        )

    return _agent_executor


def _build_message_with_context(message: str, selected_images: Optional[List[dict]], user_id: str) -> str:
    """Build the full message with image context if provided."""
    if not selected_images or len(selected_images) == 0:
        return message

    image_context = "\n\nSelected Images:\n"
    for i, img in enumerate(selected_images, 1):
        image_context += f"{i}. {img.get('title', 'Untitled')} (ID: {img.get('id', 'unknown')})\n"
        image_context += f"   Type: {img.get('type', 'unknown')}\n"
        image_context += f"   Description: {img.get('description', 'No description')}\n"
        if img.get("url"):
            image_context += f"   URL: {img.get('url')}\n"
        image_context += "\n"

    return message + image_context + f"\n\nUser ID: {user_id}"


def _extract_agent_response(response) -> str:
    """Extract the agent's response text from the response object."""
    if not response or "messages" not in response or len(response["messages"]) == 0:
        return "I'm sorry, I couldn't process your request. Please try again."

    last_message = response["messages"][-1]

    # Handle None or unexpected message types
    if last_message is None:
        return "I'm sorry, I couldn't process your request. Please try again."

    # Handle both AIMessage objects and dictionaries
    if hasattr(last_message, "content"):
        content = last_message.content
        if content is None:
            return "I'm sorry, I couldn't process your request. Please try again."
        return content
    elif isinstance(last_message, dict) and "content" in last_message:
        content = last_message["content"]
        if content is None:
            return "I'm sorry, I couldn't process your request. Please try again."
        return content

    return "I'm sorry, I couldn't process your request. Please try again."


def _generate_presigned_url(user_id: str, image_id: str) -> Optional[str]:
    """Generate a presigned URL for an image."""
    import boto3

    s3_client = boto3.client(
        "s3",
        region_name=os.environ.get("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    )

    bucket_name = os.environ.get("AWS_S3_BUCKET_NAME")
    if not bucket_name:
        print("[AGENT] AWS_S3_BUCKET_NAME not set")
        return None

    try:
        s3_key = f"users/{user_id}/images/{image_id}"
        print(f"[AGENT] Generating presigned URL for S3 key: {s3_key}")

        presigned_url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": s3_key},
            ExpiresIn=7200,  # 2 hours
        )
        print(f"[AGENT] Generated presigned URL: {presigned_url[:50]}...")
        return presigned_url

    except Exception as e:
        print(f"[AGENT] Error generating presigned URL: {e}")
        return None


def _process_generated_image(user_id: str, tool_result: dict) -> Optional[dict]:
    """Process a generated image tool result and return image data."""
    image_id = tool_result.get("image_id")
    title = tool_result.get("title", "Generated Image")
    prompt = tool_result.get("prompt", "Based on your request")

    if not image_id:
        print("[AGENT] No image_id found in tool result")
        return None

    print(f"[AGENT] Processing generated image with ID: {image_id}")

    # Generate presigned URL
    presigned_url = _generate_presigned_url(user_id, image_id)
    if not presigned_url:
        return None

    # Create image data structure using data from tool result
    generated_image_data = {
        "id": image_id,
        "url": presigned_url,
        "title": title,
        "description": f"AI-generated image: {prompt}",
        "timestamp": datetime.now().isoformat(),
        "type": "generated",
    }

    print(f"[AGENT] Created generated_image_data: {generated_image_data}")
    return generated_image_data


def _process_tool_results(user_id: str) -> Optional[dict]:
    """Process any tool results for the user and return generated image data if found."""
    print(f"[AGENT] Checking for tool results for user {user_id}")
    tool_result = get_tool_result(user_id, "generate_image")

    if tool_result:
        print(f"[AGENT] Found tool result: {tool_result}")
        return _process_generated_image(user_id, tool_result)
    else:
        print(f"[AGENT] No tool result found for user {user_id}")

    return None


def chat_with_agent(
    message: str,
    client_ip: str,
    user_id: str = "default",
    selected_images: Optional[List[dict]] = None,
) -> tuple[str, Optional[dict]]:
    """
    Send a message to the agent and get a response.

    Args:
        message: The user's message
        user_id: Unique identifier for the user/thread
        selected_images: List of selected image objects (optional)
        client_ip: IP address of the client
    Returns:
        Tuple of (agent_response, generated_image_data)
    """
    global _request_count

    # Periodic cleanup every 10 requests
    _request_count += 1
    if _request_count % 10 == 0:
        print(f"[AGENT] Running periodic cleanup (request #{_request_count})")
        cleanup_old_tool_results()

    print(f"[AGENT] Starting chat_with_agent - user_id: {user_id}, message: {message[:100]}...")
    agent = _get_agent(client_ip)

    # Prepare the message with context
    print("[AGENT] building message with context")
    full_message = _build_message_with_context(message, selected_images, user_id)

    # Configure thread ID for conversation continuity
    config = {"configurable": {"thread_id": user_id, "client_ip": client_ip}}

    # Get response from agent
    print(f"[AGENT] Invoking agent with config: {config}")
    response = agent.invoke({"messages": [{"role": "user", "content": full_message}]}, config=config)
    print(f"[AGENT] Agent response received: {type(response)}")

    # Extract the agent's response
    agent_response = _extract_agent_response(response)
    print(f"[AGENT] Extracted agent response: {agent_response[:100]}...")

    # Check for tool results and process generated images
    generated_image_data = _process_tool_results(user_id)

    print(f"[AGENT] Returning response - agent_response length: {len(agent_response)}, generated_image_data: {generated_image_data is not None}")
    return agent_response, generated_image_data


if __name__ == "__main__":
    # Test the agent
    response = chat_with_agent("Hello! How can you help me with image editing?", "127.0.0.1")
    print(response)
