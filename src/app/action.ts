"use server";

import Replicate from "replicate";
import type { GenerateState } from "@/lib/definition";

export async function GenerateAction(
  _prevState: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  try {
    // Get the prompt and image from the form data
    const prompt = (formData.get("prompt") ?? "").toString().trim();
    const image = formData.get("image") as File | null;
    if (!prompt) return { error: "Prompt is required." };
    if (!image || !image.size) return { error: "Image is required." };

    // Create a new Replicate instance
    const replicate = new Replicate();

    // Create the input for the Replicate API
    const input = {
      prompt,
      image,
      refine: "expert_ensemble_refiner",
      apply_watermark: false,
      num_inference_steps: 25,
    };

    // Define the output type for the Replicate API
    const output: unknown = await replicate.run(
      "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      {
        input,
      },
    );

    let url: string | null = null;

    type FileOutput = {
      url: () => string;
    };

    if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      if (typeof first === "object" && first !== null && "url" in first) {
        const maybe = first as FileOutput;
        url = maybe.url().toString();
      }
    }

    if (!url) return { error: "No valid image URL returned from the API." };

    // Return the URL in string format
    return { url };
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error
        ? err.message
        : "An error occurred while generating the image.";
    return { error: message };
  }
}
