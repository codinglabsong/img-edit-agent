from unittest.mock import Mock, patch

import pytest

# Mock dependencies before importing
with patch("langgraph.checkpoint.postgres.PostgresSaver"):
    with patch("llm.connection_manager.get_checkpointer"):
        with patch("llm.connection_manager._test_connection", return_value=True):
            from llm.utils import upload_generated_image_to_s3


class TestS3Utils:
    """Test cases for S3 utility functions."""

    @patch("llm.utils.boto3.client")
    @patch.dict("os.environ", {"AWS_S3_BUCKET_NAME": "test-bucket"})
    def test_upload_generated_image_success(self, mock_boto3_client):
        """Test successful image upload to S3."""
        mock_s3_client = Mock()
        mock_boto3_client.return_value = mock_s3_client

        mock_s3_client.generate_presigned_url.return_value = "https://test-bucket.s3.amazonaws.com/test-url"
        mock_s3_client.head_object.return_value = {
            "Metadata": {
                "title": "Test Image",
                "imageId": "test-uuid-123",
                "userId": "test_user",
                "uploadedAt": "2024-01-01T00:00:00Z",
                "type": "generated",
                "generationPrompt": "A beautiful sunset",
            }
        }

        result = upload_generated_image_to_s3(b"fake_image_data", "test-uuid-123", "test_user", "A beautiful sunset", "Test Image")

        assert result["success"] is True
        assert result["url"] == "https://test-bucket.s3.amazonaws.com/test-url"
        assert result["image_id"] == "test-uuid-123"

        # Verify S3 calls
        mock_s3_client.put_object.assert_called_once()
        put_call = mock_s3_client.put_object.call_args
        assert put_call[1]["Bucket"] == "test-bucket"
        assert put_call[1]["Key"] == "users/test_user/images/test-uuid-123"
        assert put_call[1]["Body"] == b"fake_image_data"
        assert put_call[1]["ContentType"] == "image/png"

    @patch("llm.utils.boto3.client")
    def test_upload_generated_image_missing_bucket(self, mock_boto3_client):
        """Test upload when S3 bucket name is not set."""
        with patch.dict("os.environ", {}, clear=True):
            result = upload_generated_image_to_s3(b"data", "id", "user", "prompt", "title")

            assert result["success"] is False
            assert "AWS_S3_BUCKET_NAME environment variable is not set" in result["error"]

    @patch("llm.utils.boto3.client")
    def test_upload_generated_image_s3_error(self, mock_boto3_client):
        """Test upload when S3 operations fail."""
        mock_s3_client = Mock()
        mock_s3_client.put_object.side_effect = Exception("S3 upload failed")
        mock_boto3_client.return_value = mock_s3_client

        result = upload_generated_image_to_s3(b"data", "id", "user", "prompt", "title")

        assert result["success"] is False
        assert "S3 upload failed" in result["error"]

    @patch("llm.utils.boto3.client")
    def test_upload_generated_image_default_title(self, mock_boto3_client):
        """Test upload with default title when none provided."""
        mock_s3_client = Mock()
        mock_boto3_client.return_value = mock_s3_client

        mock_s3_client.generate_presigned_url.return_value = "https://test-url"
        mock_s3_client.head_object.return_value = {"Metadata": {}}

        upload_generated_image_to_s3(b"data", "id", "user", "prompt")

        put_call = mock_s3_client.put_object.call_args
        metadata = put_call[1]["Metadata"]
        assert metadata["title"] == "Generated Image"


if __name__ == "__main__":
    pytest.main([__file__])
