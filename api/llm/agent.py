import atexit
import os
from functools import lru_cache
from typing import List, Optional

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.prebuilt import create_react_agent

from llm.prompt import system_message

load_dotenv()

# Global agent instance
_agent_executor = None


@lru_cache
def get_checkpointer():
    DATABASE_URL = os.environ.get("DATABASE_URL")
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set. Point it to your Neon connection string.")

    cm = PostgresSaver.from_conn_string(DATABASE_URL)
    saver = cm.__enter__()  # enter the context manager once
    atexit.register(lambda: cm.__exit__(None, None, None))  # clean shutdown
    saver.setup()  # create tables on first run; no-op afterward
    return saver


def get_agent():
    """Get or create the agent instance."""
    global _agent_executor

    if _agent_executor is None:
        # Build LLM
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

        # Create agent
        _agent_executor = create_react_agent(
            llm,
            tools=[],
            prompt=system_message,
            checkpointer=get_checkpointer(),
        )

    return _agent_executor


def chat_with_agent(
    message: str, user_id: str = "default", selected_images: Optional[List[str]] = None
) -> str:
    """
    Send a message to the agent and get a response.

    Args:
        message: The user's message
        user_id: Unique identifier for the user/thread
        selected_images: List of selected image names (optional)

    Returns:
        The agent's response as a string
    """
    agent = get_agent()

    # Prepare the message with context
    full_message = message
    if selected_images and len(selected_images) > 0:
        image_context = f" Selected images: {', '.join(selected_images)}."
        full_message = message + image_context

    # Configure thread ID for conversation continuity
    config = {"configurable": {"thread_id": user_id}}

    # Get response from agent
    response = agent.invoke(
        {"messages": [{"role": "user", "content": full_message}]}, config=config
    )

    # Extract the last message from the agent
    if response and "messages" in response and len(response["messages"]) > 0:
        last_message = response["messages"][-1]
        # Handle both AIMessage objects and dictionaries
        if hasattr(last_message, "content"):
            return last_message.content
        elif isinstance(last_message, dict) and "content" in last_message:
            return last_message["content"]

    return "I'm sorry, I couldn't process your request. Please try again."


if __name__ == "__main__":
    # Test the agent
    response = chat_with_agent("Hello! How can you help me with image editing?")
    print(response)
