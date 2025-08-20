import uuid
from typing import Optional

import replicate
import requests
from dotenv import load_dotenv
from langchain_core.tools import tool

from llm.utils import upload_generated_image_to_s3

load_dotenv()


def initialize_tools():
    """Initialize the tools for the agent."""

    @tool(
        description="Generate an image based on a prompt",
    )
    def generate_image(
        prompt: str,
        user_id: str,
        image_url: str,
    ) -> str:
        """
        Generate an image based on a prompt.
        """
        input = {
            "width": 768,
            "height": 768,
            "prompt": prompt,
            "refine": "expert_ensemble_refiner",
            "apply_watermark": False,
            "num_inference_steps": 25,
            "prompt_strength": 0.5,
            "image": image_url,
        }

        # Generate image using Replicate
        output = replicate.run(
            "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d6 \
                85e02b063e37e496e96eefd46c929f9bdc",
            input=input,
        )

        # Check if generation was successful
        if not output or len(output) == 0:
            return "Failed to generate image. Please try again."

        generated_image_url = output[0] if isinstance(output, list) else output

        # Download the generated image
        image_data: Optional[bytes] = None
        try:
            response = requests.get(generated_image_url)
            response.raise_for_status()
            image_data = response.content  # get the actual image bytes in content into memory
            # Close the response to free up resources
            response.close()
        except Exception as e:
            return f"Failed to download generated image: {str(e)}"

        # Generate unique ID for the image
        image_id = str(uuid.uuid4())

        # Upload to S3
        try:
            s3_result = upload_generated_image_to_s3(
                image_data=image_data, image_id=image_id, user_id=user_id, prompt=prompt
            )

            if s3_result["success"]:
                return f"Image generated successfully! User can find it his/her gallery. \
                    Image ID: {image_id}"
            else:
                return (
                    f"Image generated but failed to save: {s3_result.get('error', 'Unknown error')}"
                )

        except Exception as e:
            return f"Image generated but failed to save to storage: {str(e)}"

        finally:
            if image_data:
                # Clear image data from memory
                del image_data

    return [generate_image]
