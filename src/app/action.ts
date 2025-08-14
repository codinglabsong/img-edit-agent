"use server";

import Replicate from "replicate";
import type { GenerateState } from "@/lib/definition";
import { writeFile } from "fs/promises";

export async function GenerateAction(
  _prevState: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  try {
    // Get the prompt from the form data
    const prompt = (formData.get("prompt") ?? "").toString().trim();
    if (!prompt) return { error: "Prompt is required." };

    // Create a new Replicate instance
    const replicate = new Replicate();

    // Create the input for the Replicate API
    const input = {
      prompt,
      aspect_ratio: "16:9",
      safety_filter_level: "block_medium_and_above",
    };

    // Define the output type for the Replicate API
    interface Imagen4Output {
      url?: () => string;
    }
    const output = (await replicate.run("google/imagen-4", {
      input,
    })) as Imagen4Output;

    // Get the URL from the output
    const urlObj = output.url?.();

    // If no URL is returned, return an error
    if (!urlObj) {
      return { error: "No image URL returned from the API." };
    }

    // Make sure the urlObj is a string before returning it
    const url = urlObj.toString();
    return { url };

    // // To access the file URL:
    // console.log(output.url());
    // //=> "https://replicate.delivery/.../output.png"

    // // To write the file to disk:
    // await writeFile(`output.png`, output);
    // //=> output.png written to disk
  } catch (err) {
    console.error(err);
    return { error: "An error occurred while generating the image." };
  }
}
