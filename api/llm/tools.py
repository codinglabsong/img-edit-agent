import uuid
from typing import Optional

import replicate
import requests
from dotenv import load_dotenv
from langchain_core.tools import tool

from llm.utils import store_tool_result, upload_generated_image_to_s3

load_dotenv()


def initialize_tools():
    """Initialize the tools for the agent."""

    @tool(
        description="""
    Generate a high-quality image based on a detailed prompt. This tool creates stunning images using advanced AI generation techniques.

    PARAMETERS:
    - prompt (required): A detailed description of what to generate.\
      Should include style, mood, lighting, composition, and specific details for best results.\
      Still be concise and to the point.
    - user_id (required): The unique identifier for the user requesting the image.
    - image_url (required): URL of the source/reference image to base the generation on.
    - title (optional): A concise, accurate title for the generated image. Defaults to "Generated Image" if not provided.

    USAGE GUIDELINES:
    - Always enhance the user's original prompt with artistic details, lighting, style, and mood unless they explicitly say don't.
    - Include specific visual elements like "cinematic lighting", "soft bokeh", "golden hour", etc.
    - Specify composition details like "close-up portrait", "wide landscape", "rule of thirds"
    - Add color palettes and textures when relevant
    - Use professional photography and art terminology for better results

    EXAMPLE ENHANCED PROMPTS:
    - User: "a cat" → Enhanced: "A majestic orange tabby cat with emerald green eyes, sitting regally in soft golden hour lighting,\
        shallow depth of field with blurred garden background, professional portrait photography style"
    - User: "sunset" → Enhanced: "A breathtaking sunset over calm ocean waters, vibrant orange and purple sky with dramatic clouds,\
        silhouetted palm trees in foreground, cinematic wide-angle composition with warm golden lighting"

    LIMITATIONS:
    - Can only generate ONE image per request
    - Requires a source image URL
    - Generation may take 10-30 seconds
    """,
    )
    def generate_image(
        prompt: str,
        user_id: str,
        image_url: str,
        title: str = "Generated Image",
    ) -> str:
        """
        Generate an image based on a prompt.
        """
        print(f"[TOOL] generate_image called with prompt: {prompt[:50]}..., user_id: {user_id}, image_url: {image_url[:50]}...")
        input = {
            "prompt": prompt,
            "input_image": image_url,
            "output_format": "png",
        }

        # Generate image using Replicate
        print(f"[TOOL] Calling Replicate with input: {input}")
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

        # Handle Flux Kontext Pro output format
        try:
            # Flux Kontext Pro returns an object with .url() method
            generated_image_url = output.url()
            print(f"[TOOL] Extracted URL using output.url(): {generated_image_url}")
        except AttributeError:
            # Fallback for unexpected output formats
            print(f"[TOOL] No .url() method found, output type: {type(output)}")
            if isinstance(output, list):
                generated_image_url = output[0]
                print(f"[TOOL] Fallback: Extracted URL from list: {generated_image_url}")
            elif isinstance(output, str):
                generated_image_url = output
                print(f"[TOOL] Fallback: Using direct string URL: {generated_image_url}")
            else:
                print(f"[TOOL] Unexpected output type: {type(output)}, trying to convert to string")
                generated_image_url = str(output)

        print(f"[TOOL] Final generated image URL: {generated_image_url}")

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
        print(f"[TOOL] Uploading to S3 with image_id: {image_id}")
        try:
            s3_result = upload_generated_image_to_s3(
                image_data=image_data,
                image_id=image_id,
                user_id=user_id,
                prompt=prompt,
                title=title,
            )
            print(f"[TOOL] S3 upload result: {s3_result}")

            if s3_result["success"]:
                # Store structured result for the agent to retrieve
                tool_result = {"image_id": image_id, "title": title, "prompt": prompt, "success": True}
                store_tool_result(user_id, "generate_image", tool_result)

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

    return [generate_image]


if __name__ == "__main__":
    # Test the tool
    generate_image = initialize_tools()[0]
    output = generate_image.invoke(
        {
            "prompt": "A woman in a beautiful sunset over a calm ocean",
            "user_id": "123",
            "image_url": "https://example.com/image.jpg",
            "title": "Test Image",
        }
    )
    print(output)
