import atexit
import os
import re
from datetime import datetime
from functools import lru_cache
from typing import List, Optional

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.prebuilt import create_react_agent

from llm.prompt import system_message
from llm.tools import initialize_tools

load_dotenv()

# Global agent instance
_agent_executor = None
_checkpointer = None


@lru_cache
def get_checkpointer():
    """Open PostgresSaver once and reuse it (with keepalives)."""
    global _checkpointer

    if _checkpointer is None:
        url = os.environ.get("DATABASE_URL")
        if not url:
            raise RuntimeError("DATABASE_URL is not set. Point it to your Neon connection string.")

        # add keepalive params if missing
        if "keepalives=" not in url:
            sep = "&" if "?" in url else "?"
            url += (
                sep
                + "sslmode=require&keepalives=1&keepalives_idle=30&keepalives_interval=10\
                    &keepalives_count=3"
            )

        cm = PostgresSaver.from_conn_string(url)
        saver = cm.__enter__()  # enter the context manager once
        atexit.register(lambda: cm.__exit__(None, None, None))  # clean shutdown
        saver.setup()  # create tables on first run; no-op afterward
        _checkpointer = saver

    return _checkpointer


def get_agent():
    """Get or create the agent instance."""
    global _agent_executor

    if _agent_executor is None:
        # Build LLM
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

        # Build tools
        tools = initialize_tools()

        # Create agent
        _agent_executor = create_react_agent(
            llm,
            tools=tools,
            prompt=system_message,
            checkpointer=get_checkpointer(),
        )

    return _agent_executor


def chat_with_agent(message: str, user_id: str = "default", selected_images: Optional[List[dict]] = None) -> tuple[str, Optional[dict]]:
    """
    Send a message to the agent and get a response.

    Args:
        message: The user's message
        user_id: Unique identifier for the user/thread
        selected_images: List of selected image objects (optional)

    Returns:
        Tuple of (agent_response, generated_image_data)
    """
    print(f"[AGENT] Starting chat_with_agent - user_id: {user_id}, message: {message[:100]}...")
    agent = get_agent()

    # Prepare the message with context
    full_message = message
    if selected_images and len(selected_images) > 0:
        image_context = "\n\nSelected Images:\n"
        for i, img in enumerate(selected_images, 1):
            image_context += f"{i}. {img.get('title', 'Untitled')} (ID: {img.get('id', 'unknown')})\n"
            image_context += f"   Type: {img.get('type', 'unknown')}\n"
            image_context += f"   Description: {img.get('description', 'No description')}\n"
            if img.get("url"):
                image_context += f"   URL: {img.get('url')}\n"
            image_context += "\n"
        full_message = message + image_context

    # Configure thread ID for conversation continuity
    config = {"configurable": {"thread_id": user_id}}

    # Get response from agent
    print(f"[AGENT] Invoking agent with config: {config}")
    response = agent.invoke({"messages": [{"role": "user", "content": full_message}]}, config=config)
    print(f"[AGENT] Agent response received: {type(response)}")

    # Extract the last message from the agent
    agent_response = "I'm sorry, I couldn't process your request. Please try again."
    generated_image_data = None

    if response and "messages" in response and len(response["messages"]) > 0:
        print(f"[AGENT] Found {len(response['messages'])} messages in response")
        last_message = response["messages"][-1]
        print(f"[AGENT] Last message type: {type(last_message)}")
        # Handle both AIMessage objects and dictionaries
        if hasattr(last_message, "content"):
            agent_response = last_message.content
        elif isinstance(last_message, dict) and "content" in last_message:
            agent_response = last_message["content"]
        print(f"[AGENT] Extracted agent response: {agent_response[:100]}...")

        # Check if any tools were used (image generation)
        print(f"[AGENT] Checking intermediate steps: {response.get('intermediate_steps', [])}")
        if "intermediate_steps" in response and response["intermediate_steps"]:
            print(f"[AGENT] Found {len(response['intermediate_steps'])} intermediate steps")
            for i, step in enumerate(response["intermediate_steps"]):
                print(f"[AGENT] Step {i}: {step}")
                if len(step) >= 2 and "generate_image" in str(step[0]):
                    # Extract image data from the tool result
                    tool_result = step[1]
                    print(f"[AGENT] Found generate_image tool result: {tool_result}")

                    # Try multiple patterns to find the image ID
                    image_id = None
                    title = "Generated Image"

                    # Pattern 1: "Image ID: uuid"
                    match = re.search(r"Image ID: ([a-f0-9-]+)", tool_result)
                    if match:
                        image_id = match.group(1)

                    # Pattern 2: "ID: uuid"
                    if not image_id:
                        match = re.search(r"ID: ([a-f0-9-]+)", tool_result)
                        if match:
                            image_id = match.group(1)

                    # Extract title if present
                    title_match = re.search(r"Title: (.+?)(?:\n|$)", tool_result)
                    if title_match:
                        title = title_match.group(1)

                    if image_id:
                        print(f"[AGENT] Found image_id: {image_id}, attempting to get S3 metadata")
                        # Get metadata from S3
                        import boto3

                        s3_client = boto3.client(
                            "s3",
                            region_name=os.environ.get("AWS_REGION", "us-east-1"),
                            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
                            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
                        )

                        bucket_name = os.environ.get("AWS_S3_BUCKET_NAME")
                        print(f"[AGENT] Using bucket: {bucket_name}")
                        if bucket_name:
                            try:
                                # Get metadata from S3
                                s3_key = f"users/{user_id}/images/{image_id}"
                                print(f"[AGENT] Getting metadata for S3 key: {s3_key}")
                                metadata_response = s3_client.head_object(Bucket=bucket_name, Key=s3_key)
                                metadata = metadata_response.get("Metadata", {})
                                print(f"[AGENT] Retrieved metadata: {metadata}")

                                # Generate presigned URL
                                presigned_url = s3_client.generate_presigned_url(
                                    "get_object",
                                    Params={"Bucket": bucket_name, "Key": f"users/{user_id}/images/{image_id}"},
                                    ExpiresIn=7200,  # 2 hours
                                )
                                print(f"[AGENT] Generated presigned URL: {presigned_url[:50]}...")

                                generated_image_data = {
                                    "id": image_id,
                                    "url": presigned_url,
                                    "title": metadata.get("title", title),
                                    "description": f"AI-generated image: {metadata.get('generationPrompt', 'Based on your request')}",
                                    "timestamp": metadata.get("uploadedAt", datetime.now().isoformat()),
                                    "type": "generated",
                                }
                                print(f"[AGENT] Created generated_image_data: {generated_image_data}")

                            except Exception as e:
                                print(f"[AGENT] Error getting S3 metadata: {e}")
                                # Don't return image data if we can't get a valid URL
                                generated_image_data = None
                                # Add error message to agent response
                                agent_response += "\n\n⚠️ Note: I generated the image successfully, \
                                                    but there was an issue retrieving it from the database. Please try again."

    print(f"[AGENT] Returning response - agent_response length: {len(agent_response)}, generated_image_data: {generated_image_data is not None}")
    return agent_response, generated_image_data


if __name__ == "__main__":
    # Test the agent
    response = chat_with_agent("Hello! How can you help me with image editing?")
    print(response)
