"use server";

interface ChatRequest {
  message: string;
  selected_images?: string[];
  user_id?: string;
}

interface ChatResponse {
  response: string;
  status: string;
}

const HF_API_URL = process.env.HF_API_URL || "http://localhost:8000";

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
