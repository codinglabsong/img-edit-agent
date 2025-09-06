from unittest.mock import Mock, patch

import pytest

# Mock the imports to avoid dependency issues
with patch("langchain_google_genai.ChatGoogleGenerativeAI"):
    with patch("langgraph.prebuilt.create_react_agent"):
        with patch("langgraph.checkpoint.postgres.PostgresSaver"):
            with patch("llm.connection_manager.get_checkpointer"):
                with patch("llm.connection_manager._test_connection", return_value=True):
                    from llm.agent import chat_with_agent


class TestAgent:
    """Test cases for the agent functionality."""

    @patch("llm.agent._get_agent")
    def test_chat_with_agent_basic_response(self, mock_get_agent):
        """Test basic chat response without image generation."""
        mock_agent = Mock()
        mock_agent.invoke.return_value = {
            "messages": [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi there! How can I help you?"}]
        }
        mock_get_agent.return_value = mock_agent

        response, generated_image = chat_with_agent("Hello", "127.0.0.1", "test_user")

        assert response == "Hi there! How can I help you?"
        assert generated_image is None

    @patch("llm.agent._get_agent")
    def test_chat_with_agent_no_image_generation(self, mock_get_agent):
        """Test chat when no image generation tools are used."""
        mock_agent = Mock()
        mock_agent.invoke.return_value = {
            "messages": [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi! I can help you with image editing."}],
            "intermediate_steps": [],  # No tools used
        }
        mock_get_agent.return_value = mock_agent

        response, generated_image = chat_with_agent("Hello", "127.0.0.1", "test_user")

        assert response == "Hi! I can help you with image editing."
        assert generated_image is None

    @patch("llm.agent._get_agent")
    def test_chat_with_agent_with_selected_images(self, mock_get_agent):
        """Test chat with selected images context."""
        selected_images = [
            {"id": "img-1", "title": "Test Image 1", "type": "uploaded", "description": "A test image", "url": "https://example.com/img1.jpg"}
        ]

        mock_agent = Mock()
        mock_agent.invoke.return_value = {"messages": [{"role": "assistant", "content": "I see your selected image!"}]}
        mock_get_agent.return_value = mock_agent

        response, generated_image = chat_with_agent("Edit this image", "127.0.0.1", "test_user", selected_images=selected_images)

        # Verify that the agent was called with image context
        call_args = mock_agent.invoke.call_args
        assert call_args is not None
        user_message = call_args[0][0]["messages"][0]["content"]
        assert "Selected Images:" in user_message
        assert "Test Image 1" in user_message
        assert "img-1" in user_message

    @patch("llm.agent._get_agent")
    def test_chat_with_agent_error_handling(self, mock_get_agent):
        """Test agent error handling."""
        mock_agent = Mock()
        mock_agent.invoke.side_effect = Exception("Agent error")
        mock_get_agent.return_value = mock_agent

        with pytest.raises(Exception, match="Agent error"):
            chat_with_agent("Hello", "127.0.0.1", "test_user")


if __name__ == "__main__":
    pytest.main([__file__])
