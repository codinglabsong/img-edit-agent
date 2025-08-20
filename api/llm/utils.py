import os
from datetime import datetime
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError


def upload_generated_image_to_s3(image_data: bytes, image_id: str, user_id: str, prompt: str, title: str = "Generated Image") -> Dict[str, Any]:
    """
    Upload a generated image to S3.

    Args:
        image_data: The image data as bytes
        image_id: Unique identifier for the image
        user_id: User identifier
        prompt: The prompt used to generate the image
        title: Custom title for the image

    Returns:
        Dict with success status, URL, and metadata or error message
    """
    try:
        # Initialize S3 client
        s3_client = boto3.client(
            "s3",
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )

        # Generate S3 key with userId and imageId for organization
        key = f"users/{user_id}/images/{image_id}"
        bucket_name = os.environ.get("AWS_S3_BUCKET_NAME")

        if not bucket_name:
            return {"success": False, "error": "AWS_S3_BUCKET_NAME environment variable is not set"}

        # Upload to S3
        s3_client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=image_data,
            ContentType="image/png",
            Metadata={
                "title": title,
                "imageId": image_id,
                "userId": user_id,
                "uploadedAt": datetime.now().isoformat(),
                "type": "generated",
                "generationPrompt": prompt,
            },
        )

        # Generate presigned URL for reading the uploaded file (valid for 2 hours)
        presigned_url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": key},
            ExpiresIn=7200,  # 2 hours
        )

        # Get metadata from S3
        metadata_response = s3_client.head_object(Bucket=bucket_name, Key=key)
        metadata = metadata_response.get("Metadata", {})

        return {"success": True, "url": presigned_url, "image_id": image_id, "metadata": metadata}

    except ClientError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": str(e)}
