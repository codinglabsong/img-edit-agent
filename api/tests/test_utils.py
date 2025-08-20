from unittest.mock import Mock, patch

import pytest

from llm.utils import upload_generated_image_to_s3


class TestS3Utils:
    """Test cases for S3 utility functions."""

    @patch("llm.utils.boto3.client")
    @patch.dict("os.environ", {"AWS_S3_BUCKET_NAME": "test-bucket"})
    def test_upload_generated_image_success(self, mock_boto3_client):
        """Test successful image upload to S3."""
        # Mock S3 client
        mock_s3_client = Mock()
        mock_boto3_client.return_value = mock_s3_client

        # Mock S3 responses
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

        # Test data
        image_data = b"fake_image_data"
        image_id = "test-uuid-123"
        user_id = "test_user"
        prompt = "A beautiful sunset"
        title = "Test Image"

        # Test upload
        result = upload_generated_image_to_s3(image_data, image_id, user_id, prompt, title)

        # Verify success
        assert result["success"] is True
        assert result["url"] == "https://test-bucket.s3.amazonaws.com/test-url"
        assert result["image_id"] == image_id
        assert "metadata" in result

        # Verify S3 calls
        mock_s3_client.put_object.assert_called_once()
        put_call = mock_s3_client.put_object.call_args
        assert put_call[1]["Bucket"] == "test-bucket"  # From env var
        assert put_call[1]["Key"] == f"users/{user_id}/images/{image_id}"
        assert put_call[1]["Body"] == image_data
        assert put_call[1]["ContentType"] == "image/png"

        # Verify metadata
        metadata = put_call[1]["Metadata"]
        assert metadata["title"] == title
        assert metadata["imageId"] == image_id
        assert metadata["userId"] == user_id
        assert metadata["type"] == "generated"
        assert metadata["generationPrompt"] == prompt

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
        # Mock S3 client with error
        mock_s3_client = Mock()
        mock_s3_client.put_object.side_effect = Exception("S3 upload failed")
        mock_boto3_client.return_value = mock_s3_client

        result = upload_generated_image_to_s3(b"data", "id", "user", "prompt", "title")

        assert result["success"] is False
        assert "S3 upload failed" in result["error"]

    @patch("llm.utils.boto3.client")
    def test_upload_generated_image_metadata_retrieval_error(self, mock_boto3_client):
        """Test upload when metadata retrieval fails."""
        # Mock S3 client
        mock_s3_client = Mock()
        mock_boto3_client.return_value = mock_s3_client

        # Mock successful upload but failed metadata retrieval
        mock_s3_client.generate_presigned_url.return_value = "https://test-url"
        mock_s3_client.head_object.side_effect = Exception("Metadata retrieval failed")

        result = upload_generated_image_to_s3(b"data", "id", "user", "prompt", "title")

        assert result["success"] is False
        assert "Metadata retrieval failed" in result["error"]

    @patch("llm.utils.boto3.client")
    def test_upload_generated_image_default_title(self, mock_boto3_client):
        """Test upload with default title when none provided."""
        # Mock S3 client
        mock_s3_client = Mock()
        mock_boto3_client.return_value = mock_s3_client

        mock_s3_client.generate_presigned_url.return_value = "https://test-url"
        mock_s3_client.head_object.return_value = {"Metadata": {}}

        # Test without title parameter
        _ = upload_generated_image_to_s3(b"data", "id", "user", "prompt")

        # Verify default title was used
        put_call = mock_s3_client.put_object.call_args
        metadata = put_call[1]["Metadata"]
        assert metadata["title"] == "Generated Image"

    @patch("llm.utils.boto3.client")
    def test_upload_generated_image_custom_title(self, mock_boto3_client):
        """Test upload with custom title."""
        # Mock S3 client
        mock_s3_client = Mock()
        mock_boto3_client.return_value = mock_s3_client

        mock_s3_client.generate_presigned_url.return_value = "https://test-url"
        mock_s3_client.head_object.return_value = {"Metadata": {}}

        custom_title = "My Custom Image Title"
        _ = upload_generated_image_to_s3(b"data", "id", "user", "prompt", custom_title)

        # Verify custom title was used
        put_call = mock_s3_client.put_object.call_args
        metadata = put_call[1]["Metadata"]
        assert metadata["title"] == custom_title

    @patch("llm.utils.boto3.client")
    def test_upload_generated_image_presigned_url_expiry(self, mock_boto3_client):
        """Test that presigned URL is generated with correct expiry."""
        # Mock S3 client
        mock_s3_client = Mock()
        mock_boto3_client.return_value = mock_s3_client

        mock_s3_client.generate_presigned_url.return_value = "https://test-url"
        mock_s3_client.head_object.return_value = {"Metadata": {}}

        upload_generated_image_to_s3(b"data", "id", "user", "prompt", "title")

        # Verify presigned URL was generated with 2 hour expiry
        generate_call = mock_s3_client.generate_presigned_url.call_args
        assert generate_call[1]["ExpiresIn"] == 7200  # 2 hours


if __name__ == "__main__":
    pytest.main([__file__])
