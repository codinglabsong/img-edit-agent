"use client";

import { useState, useEffect } from "react";
import ChatInterface from "@/ui/chat-interface";
import ImageCard from "@/ui/image-card";
import { sendChatMessage } from "@/lib/actions";
import type { Message, ImageItem } from "@/lib/types";

const INITIAL_MESSAGE: Message = {
  id: "initial-message",
  content:
    "Hello! I'm your AI image editing assistant. Upload an image and I'll help you edit it with AI. You can also ask me questions about your images or get editing suggestions!",
  sender: "agent",
  timestamp: new Date("2024-01-01T00:00:00Z"), // Static timestamp for hydration
};

const SAMPLE_IMAGES: ImageItem[] = [
  {
    id: "img_001",
    url: null,
    title: "Sample Image 1",
    description:
      "A beautiful landscape with mountains and a serene lake reflecting the sky.",
    timestamp: new Date(Date.now() - 86400000), // 1 day ago
  },
  {
    id: "img_002",
    url: null,
    title: "Sample Image 2",
    description:
      "Urban cityscape with modern architecture and vibrant street life.",
    timestamp: new Date(Date.now() - 43200000), // 12 hours ago
  },
  {
    id: "img_003",
    url: null,
    title: "Sample Image 3",
    description:
      "Portrait photography with dramatic lighting and artistic composition.",
    timestamp: new Date(),
  },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [images] = useState<ImageItem[]>(SAMPLE_IMAGES);
  const [isLoading, setIsLoading] = useState(false);

  // Scroll to the right end (newest images) on mount and window resize
  useEffect(() => {
    const scrollContainer = document.getElementById("image-scroll-container");

    const scrollToRight = () => {
      if (scrollContainer) {
        scrollContainer.scrollLeft = scrollContainer.scrollWidth;
      }
    };

    // Initial scroll
    setTimeout(scrollToRight, 1);

    // Add resize listener
    window.addEventListener("resize", scrollToRight);

    // Cleanup
    return () => {
      window.removeEventListener("resize", scrollToRight);
    };
  }, []);

  const handleImageSelection = (imageId: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const createMessage = (
    content: string,
    sender: "user" | "agent",
  ): Message => ({
    id: crypto.randomUUID(),
    content,
    sender,
    timestamp: new Date(),
  });

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleChatMessage = async (message: string) => {
    const selectedImageIds = Array.from(selectedImages);
    const imageMetadata =
      selectedImageIds.length > 0
        ? `\n\nSelected Images: ${selectedImageIds.join(", ")}`
        : "";

    // Add user message
    const userMessage = createMessage(message + imageMetadata, "user");
    addMessage(userMessage);

    // Set loading state
    setIsLoading(true);

    // Get AI response
    try {
      const apiResponse = await sendChatMessage({
        message,
        selected_images: selectedImageIds,
        user_id: "user_001",
      });

      const aiMessage = createMessage(apiResponse.response, "agent");
      addMessage(aiMessage);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const fallbackMessage = createMessage(
        "I'm having trouble connecting to my AI service right now. Please try again later!",
        "agent",
      );
      addMessage(fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatImageUpload = async (file: File) => {
    const uploadMessage = `📷 Uploaded image: ${file.name}`;

    // Add user message
    const userMessage = createMessage(uploadMessage, "user");
    addMessage(userMessage);

    // Set loading state
    setIsLoading(true);

    // Get AI response
    try {
      const apiResponse = await sendChatMessage({
        message: uploadMessage,
        selected_images: [],
        user_id: "user_001",
      });

      const aiMessage = createMessage(apiResponse.response, "agent");
      addMessage(aiMessage);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const fallbackMessage = createMessage(
        `I see you've uploaded "${file.name}". I can help you edit this image! What would you like to do with it?`,
        "agent",
      );
      addMessage(fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-700 via-gray-950 to-black">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 p-6 min-h-screen">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="p-1 text-3xl font-bold bg-gradient-to-r from-white to-gray-600 bg-clip-text text-transparent">
                AI Image Editor
              </h1>
              <p className="text-gray-400 mt-1">
                Transform your images with AI-powered editing
              </p>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-200">Your Images</h2>
            {selectedImages.size === 0 ? (
              <p className="text-sm text-gray-400">
                Click to select images for editing
              </p>
            ) : (
              <div className="bg-blue-600/20 backdrop-blur-xl rounded-xl px-3 border border-blue-500/30">
                <span className="text-blue-300 text-sm font-medium">
                  {selectedImages.size} image
                  {selectedImages.size !== 1 ? "s" : ""} selected
                </span>
              </div>
            )}
          </div>

          <div
            className="w-full overflow-x-auto minimal-scrollbar"
            id="image-scroll-container"
          >
            <div className="flex gap-6 px-2 py-4">
              {images.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  isSelected={selectedImages.has(image.id)}
                  fallbackImageUrl={null}
                  onSelect={handleImageSelection}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="h-[600px] bg-gray-700/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleChatMessage}
            onImageUpload={handleChatImageUpload}
            isLoading={isLoading}
          />
        </div>
      </div>
    </main>
  );
}
