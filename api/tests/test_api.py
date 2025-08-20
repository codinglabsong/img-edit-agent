from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from server.main import app

client = TestClient(app)


class TestAPI:
    """Test cases for the API endpoints."""

    def test_health_check(self):
        """Test the health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ai-image-editor-api"

    def test_root_endpoint(self):
        """Test the root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    @patch("server.main.chat_with_agent")
    def test_chat_endpoint_basic(self, mock_chat_with_agent):
        """Test basic chat endpoint without image generation."""
        # Mock the agent response
        mock_chat_with_agent.return_value = ("Hello! I can help you with image editing.", None)

        request_data = {"message": "Hello", "selected_images": [], "user_id": "test_user"}

        response = client.post("/chat", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert data["response"] == "Hello! I can help you with image editing."
        assert data["status"] == "success"
        assert data["generated_image"] is None

    @patch("server.main.chat_with_agent")
    def test_chat_endpoint_with_image_generation(self, mock_chat_with_agent):
        """Test chat endpoint with image generation."""
        # Mock the agent response with generated image
        generated_image_data = {
            "id": "test-uuid-123",
            "url": "https://test-bucket.s3.amazonaws.com/test-url",
            "title": "Generated Test Image",
            "description": "AI-generated image: A beautiful sunset",
            "timestamp": "2024-01-01T00:00:00Z",
            "type": "generated",
        }

        mock_chat_with_agent.return_value = ("I've generated an image for you!", generated_image_data)

        request_data = {"message": "Generate an image of a sunset", "selected_images": [], "user_id": "test_user"}

        response = client.post("/chat", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert data["response"] == "I've generated an image for you!"
        assert data["status"] == "success"
        assert data["generated_image"] is not None
        assert data["generated_image"]["id"] == "test-uuid-123"
        assert data["generated_image"]["url"] == "https://test-bucket.s3.amazonaws.com/test-url"
        assert data["generated_image"]["title"] == "Generated Test Image"

    @patch("server.main.chat_with_agent")
    def test_chat_endpoint_with_selected_images(self, mock_chat_with_agent):
        """Test chat endpoint with selected images."""
        mock_chat_with_agent.return_value = ("I see your selected images!", None)

        request_data = {
            "message": "Edit these images",
            "selected_images": [
                {
                    "id": "img-1",
                    "url": "https://example.com/img1.jpg",
                    "title": "Test Image 1",
                    "description": "A test image",
                    "timestamp": "2024-01-01T00:00:00Z",
                    "type": "uploaded",
                }
            ],
            "user_id": "test_user",
        }

        response = client.post("/chat", json=request_data)
        assert response.status_code == 200

        # Verify that chat_with_agent was called with the correct data
        mock_chat_with_agent.assert_called_once()
        call_args = mock_chat_with_agent.call_args
        assert call_args[1]["message"] == "Edit these images"
        assert call_args[1]["user_id"] == "test_user"
        assert len(call_args[1]["selected_images"]) == 1
        assert call_args[1]["selected_images"][0]["id"] == "img-1"

    @patch("server.main.chat_with_agent")
    def test_chat_endpoint_error_handling(self, mock_chat_with_agent):
        """Test chat endpoint error handling."""
        # Mock the agent to raise an exception
        mock_chat_with_agent.side_effect = Exception("Agent error")

        request_data = {"message": "Hello", "selected_images": [], "user_id": "test_user"}

        response = client.post("/chat", json=request_data)
        assert response.status_code == 500

        data = response.json()
        assert "Error processing request" in data["detail"]

    def test_chat_endpoint_invalid_request(self):
        """Test chat endpoint with invalid request data."""
        # Missing required fields
        request_data = {
            "message": "Hello"
            # Missing selected_images and user_id - but these are optional
        }

        response = client.post("/chat", json=request_data)
        assert response.status_code == 200  # Should work since fields are optional

    @patch("server.main.chat_with_agent")
    def test_chat_endpoint_empty_message(self, mock_chat_with_agent):
        """Test chat endpoint with empty message."""
        # Mock the agent response
        mock_chat_with_agent.return_value = ("Hello!", None)

        request_data = {"message": "", "selected_images": [], "user_id": "test_user"}

        response = client.post("/chat", json=request_data)
        assert response.status_code == 200  # Should still work with empty message


if __name__ == "__main__":
    pytest.main([__file__])
