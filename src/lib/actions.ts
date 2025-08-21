"use server";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { GeneratedImage } from "./types";

interface ChatRequest {
  message: string;
  selected_images: Array<{
    id: string;
    url: string | null;
    title: string;
    description: string;
    timestamp: Date;
    type: "uploaded" | "generated" | "sample";
  }>;
  user_id?: string;
}

interface ChatResponse {
  response: string;
  status: string;
  generated_image?: GeneratedImage;
}

interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

const HF_API_URL = process.env.HF_API_URL || "http://localhost:8000";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function sendChatMessage(
  request: ChatRequest,
): Promise<ChatResponse> {
  try {
    const response = await fetch(`${HF_API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as ChatResponse;
  } catch (error) {
    console.error("Error sending chat message:", error);
    // Fallback response in case of API failure
    return {
      response:
        "I'm having trouble connecting right now. Please try again later!",
      status: "error",
    };
  }
}

export async function uploadImageToS3(
  file: File,
  imageId: string,
  userId: string,
): Promise<UploadResponse> {
  try {
    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate S3 key with userId and imageId for organization
    const key = `users/${userId}/images/${imageId}`;
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;

    if (!bucketName) {
      throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
    }

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        title: file.name,
        imageId: imageId,
        userId: userId,
        uploadedAt: new Date().toISOString(),
        type: "uploaded",
      },
    });

    await s3Client.send(putCommand);

    // Generate presigned URL for reading the uploaded file (valid for 1 hour)
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 7200, // 2 hours
    });

    return {
      success: true,
      url: presignedUrl,
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function downloadImage(
  imageUrl: string,
): Promise<{ success: boolean; error?: string; blob?: Blob }> {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();

    return {
      success: true,
      blob,
    };
  } catch (error) {
    console.error("Error downloading image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
