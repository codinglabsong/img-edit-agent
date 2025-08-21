import os
from datetime import datetime, timedelta
from threading import Lock
from typing import Any, Dict, Optional

import boto3
from botocore.exceptions import ClientError

from llm.connection_manager import get_checkpointer

# ------------------------- Agent's tool related utils -------------------------
# User-specific storage for tool results (thread-safe)
_user_tool_results: Dict[str, Dict] = {}
_storage_lock = Lock()
# Track when results were stored for cleanup
_result_timestamps: Dict[str, datetime] = {}


def store_tool_result(user_id: str, tool_name: str, result: Dict[str, Any]) -> None:
    """
    Store tool result for a specific user.

    Args:
        user_id: Unique identifier for the user
        tool_name: Name of the tool that produced the result
        result: The result data to store
    """
    with _storage_lock:
        if user_id not in _user_tool_results:
            _user_tool_results[user_id] = {}
        _user_tool_results[user_id][tool_name] = result
        _result_timestamps[f"{user_id}:{tool_name}"] = datetime.now()
        print(f"[STORAGE] Stored {tool_name} result for user {user_id}: {result}")


def get_tool_result(user_id: str, tool_name: str) -> Optional[Dict[str, Any]]:
    """
    Get tool result for a specific user and clear it.

    Args:
        user_id: Unique identifier for the user
        tool_name: Name of the tool to get result for

    Returns:
        The tool result if found, None otherwise
    """
    with _storage_lock:
        if user_id in _user_tool_results and tool_name in _user_tool_results[user_id]:
            result = _user_tool_results[user_id].pop(tool_name)
            timestamp_key = f"{user_id}:{tool_name}"
            if timestamp_key in _result_timestamps:
                del _result_timestamps[timestamp_key]
            print(f"[STORAGE] Retrieved {tool_name} result for user {user_id}: {result}")
            return result
        return None


def clear_user_tool_results(user_id: str) -> None:
    """
    Clear all tool results for a specific user.

    Args:
        user_id: Unique identifier for the user
    """
    with _storage_lock:
        if user_id in _user_tool_results:
            # Remove all timestamps for this user
            keys_to_remove = [k for k in _result_timestamps.keys() if k.startswith(f"{user_id}:")]
            for key in keys_to_remove:
                del _result_timestamps[key]

            del _user_tool_results[user_id]
            print(f"[STORAGE] Cleared all tool results for user {user_id}")


def cleanup_old_tool_results(max_age_hours: int = 24) -> None:
    """
    Clean up tool results older than the specified age.

    Args:
        max_age_hours: Maximum age in hours before cleanup (default: 24 hours)
    """
    cutoff_time = datetime.now() - timedelta(hours=max_age_hours)

    with _storage_lock:
        keys_to_remove = []
        for timestamp_key, timestamp in _result_timestamps.items():
            if timestamp < cutoff_time:
                keys_to_remove.append(timestamp_key)

        for timestamp_key in keys_to_remove:
            user_id, tool_name = timestamp_key.split(":", 1)
            if user_id in _user_tool_results and tool_name in _user_tool_results[user_id]:
                del _user_tool_results[user_id][tool_name]
                # Clean up empty user entries
                if not _user_tool_results[user_id]:
                    del _user_tool_results[user_id]
            del _result_timestamps[timestamp_key]

        if keys_to_remove:
            print(f"[STORAGE] Cleaned up {len(keys_to_remove)} old tool results")


# ------------------------- S3 Upload of images -------------------------
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

        return {"success": True, "url": presigned_url, "image_id": image_id}

    except ClientError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ------------------------- IP Generation Count and Guardrails -------------------------


def get_ip_generation_count(ip_address: str) -> int:
    """
    Query the database for IP address generation count for the current week.

    Args:
        ip_address: The IP address to query

    Returns:
        generation_count
        If no data found, returns 0
    """
    try:
        checkpointer = get_checkpointer()

        # Get the start of the current week (Monday)
        now = datetime.now()
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

        # Query the rate_limits table for this IP in current week
        # Using a simple SQL query to get the data
        with checkpointer.conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT generation_count
                FROM rate_limits
                WHERE ip_address = %s AND week_start = %s
            """,
                (ip_address, start_of_week.date()),
            )

            row = cursor.fetchone()

        if row:
            count = row.get("generation_count")
            print(f"[UTILS] IP {ip_address}: {count} generations already made this week")
            return int(count)

        print(f"[UTILS] IP {ip_address}: No data found")
        return 0

    except Exception as e:
        print(f"[UTILS] Error querying IP generation data: {e}")
        return 0


def create_rate_limits_table():
    """
    Create the rate_limits table if it doesn't exist.
    """
    try:
        from llm.connection_manager import get_checkpointer

        checkpointer = get_checkpointer()

        with checkpointer.conn.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS rate_limits (
                    id SERIAL PRIMARY KEY,
                    ip_address VARCHAR(45) NOT NULL,
                    week_start DATE NOT NULL,
                    generation_count INTEGER DEFAULT 0,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(ip_address, week_start)
                )
            """
            )
            checkpointer.conn.commit()
            print("[UTILS] Rate limits table created/verified successfully")

    except Exception as e:
        print(f"[UTILS] Error creating rate limits table: {e}")


def create_or_update_ip_generation_count(ip_address: str) -> bool:
    """
    Update the generation count for an IP address, or create a new one if it doesn't exist.

    Args:
        ip_address: The IP address to update

    Returns:
        True if successful, False otherwise
    """
    try:
        from llm.connection_manager import get_checkpointer

        checkpointer = get_checkpointer()

        # Get the start of the current week (Monday)
        now = datetime.now()
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

        with checkpointer.conn.cursor() as cursor:
            # Use UPSERT to either insert new record or update existing one
            cursor.execute(
                """
                INSERT INTO rate_limits (ip_address, week_start, generation_count, last_updated)
                VALUES (%s, %s, 1, %s)
                ON CONFLICT (ip_address, week_start)
                DO UPDATE SET
                    generation_count = rate_limits.generation_count + 1,
                    last_updated = EXCLUDED.last_updated
            """,
                (ip_address, start_of_week.date(), now.isoformat()),
            )

            checkpointer.conn.commit()
            print(f"[UTILS] Created or Updated generation count for IP {ip_address}")
            return True

    except Exception as e:
        print(f"[UTILS] Error updating IP generation count: {e}")
        return False
