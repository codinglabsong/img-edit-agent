import uuid
from typing import Dict, Optional

import replicate
from dotenv import load_dotenv
from langchain_core.runnables import RunnableConfig, RunnableLambda
from pydantic import BaseModel

from llm.prompt import generate_image_tool_description
from llm.utils import create_or_update_ip_generation_count, get_ip_generation_count, store_tool_result, upload_generated_image_to_s3

load_dotenv()


# The generate_image tool's input schema
class GenerateImageToolInput(BaseModel):
    prompt: str
    user_id: str
    image_url: str
    title: Optional[str] = "Generated Image"


# The core function that generates an image of the tool
def _generate_image_core(
    prompt: str,
    user_id: str,
    image_url: str,
    title: str,
    client_ip: str,
) -> str:
    """
    Generate an image based on a prompt.
    """
    print(f"[TOOL] generate_image called with prompt: {prompt[:50]}..., user_id: {user_id}, image_url: {image_url[:50]}...")

    # Check if the user has exceeded the generation limit
    if get_ip_generation_count(client_ip) >= 10:
        print("[TOOL] User exceeded the generation limit of 10 this week.")
        return "Failed as user exceeded the max generation limit of 10 this week."

    use_sdxl = False  # True for testing purposes
    if use_sdxl:
        input = {
            "width": 768,
            "height": 768,
            "prompt": prompt,
            "refine": "expert_ensemble_refiner",
            "apply_watermark": False,
            "num_inference_steps": 25,
            "prompt_strength": 0.5,
            "image": image_url,
            "input_image": image_url,
            "output_format": "png",
        }
        version = "stability-ai/sdxl:" "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc"
        output = replicate.run(
            version,
            input=input,
        )
        generated_image_url = output[0] if isinstance(output, list) else output
    else:  # Flux Kontext Pro
        # Generate image using Replicate
        input = {
            "prompt": prompt,
            "input_image": image_url,
            "output_format": "png",
        }
        output = replicate.run(
            "black-forest-labs/flux-kontext-pro",
            input=input,
        )
        print(f"[TOOL] Replicate output: {output}")
        print(f"[TOOL] Output type: {type(output)}")
        print(f"[TOOL] Output length: {len(output) if hasattr(output, '__len__') else 'N/A'}")

        # Check if generation was successful
        if not output or (hasattr(output, "__len__") and len(output) == 0):
            print("[TOOL] Replicate generation failed - no output")
            return "Failed to generate image. Please try again."

        # Flux Kontext Pro returns a string URL
        generated_image_url = str(output)
        print(f"[TOOL] Generated image URL: {generated_image_url}")

    # Handle Flux Kontext Pro output format
    image_data: Optional[bytes] = None

    try:
        # Download the image from the URL
        import requests

        response = requests.get(generated_image_url)
        response.raise_for_status()
        image_data = response.content
        print(f"[TOOL] Downloaded image data, size: {len(image_data)} bytes")

    except Exception as e:
        print(f"[TOOL] Error processing output: {e}")
        return f"Failed to process generated image: {str(e)}"

    # Check if we successfully got image data
    if image_data is None:
        return "Failed to get image data from generation output"

    # Update or create a new generation count by + 1 for this ip address
    create_or_update_ip_generation_count(client_ip)

    # Generate unique ID for the image
    image_id = str(uuid.uuid4())

    # Upload to S3
    print(f"[TOOL] Uploading to S3 with image_id: {image_id}")
    print(f"[TOOL] Image data size: {len(image_data)} bytes")
    try:
        s3_result = upload_generated_image_to_s3(
            image_data=image_data,
            image_id=image_id,
            user_id=user_id,
            prompt=prompt,
            title=title,
        )
        print(f"[TOOL] S3 upload result: {s3_result}")
        print(f"[TOOL] S3 upload success: {s3_result.get('success', False)}")

        if s3_result["success"]:
            # Store structured result for the agent to retrieve
            tool_result = {"image_id": image_id, "title": title, "prompt": prompt, "success": True}
            print(f"[TOOL] About to store tool result: {tool_result}")
            store_tool_result(user_id, "generate_image", tool_result)
            print("[TOOL] Tool result stored successfully")

            result_msg = f"Image generated successfully! User can find it his/her gallery. \
                Image ID: {image_id}, Title: {title}"
            print(f"[TOOL] Returning success: {result_msg}")
            return result_msg
        else:
            error_msg = f"Image generated but failed to save: {s3_result.get('error', 'Unknown error')}"
            print(f"[TOOL] Returning error: {error_msg}")
            return error_msg

    except Exception as e:
        error_msg = f"Image generated but failed to save to storage: {str(e)}"
        print(f"[TOOL] Exception during S3 upload: {error_msg}")
        return error_msg

    finally:
        if image_data:
            # Clear image data from memory
            del image_data


def _generate_image_callable(inputs: Dict[str, str], config: RunnableConfig):
    # Normalize inputs whether dict or Pydantic
    if hasattr(inputs, "model_dump"):
        inputs = inputs.model_dump()
    elif hasattr(inputs, "dict"):
        inputs = inputs.dict()

    # Pull the IP from the per-invoke config
    cfg = config.get("configurable") or {}

    ip = cfg.get("client_ip")
    if not isinstance(ip, str) or not ip:
        # Fail fast if it's absent or not a string
        raise ValueError("client_ip is required in config.configurable and must be a non-empty string")

    client_ip: str = ip

    # Call your core with the IP
    return _generate_image_core(
        prompt=inputs["prompt"],
        user_id=inputs["user_id"],
        image_url=inputs["image_url"],
        title=inputs.get("title", "Generated Image"),
        client_ip=client_ip,
    )


def initialize_tools():
    """Initialize the tools for the agent."""
    print("[TOOLS] building generate_image tool")

    # A Runnable that receives (inputs, config) every invoke
    generate_image_runnable = RunnableLambda(_generate_image_callable)

    # As agent creation API expects "tools", convert the runnable to a Tool:
    generate_image_tool = generate_image_runnable.as_tool(
        name="generate_image",
        description=generate_image_tool_description,
        args_schema=GenerateImageToolInput,
    )

    return [generate_image_tool]


if __name__ == "__main__":
    # Test the tool
    generate_image = initialize_tools()[0]
    output = generate_image.invoke(
        {
            "prompt": "A woman in a beautiful sunset over a calm ocean",
            "user_id": "123",
            "image_url": "https://example.com/image.jpg",
            "title": "Test Image",
        },
        config={"configurable": {"client_ip": "127.0.0.1"}},
    )
    print(output)
