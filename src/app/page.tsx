"use client";

import { useState, useActionState, useEffect } from "react";
import { GenerateAction } from "@/app/action";
import type { GenerateState } from "@/lib/definition";
import ImagePreview from "@/ui/image-preview";
import ChatInterface, { Message } from "@/ui/chat-interface";

interface ImageItem {
  id: string;
  url: string | null;
  title: string;
  description: string;
  timestamp: Date;
}

const initialState: GenerateState = {
  url: null,
  error: null,
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm your AI image editing assistant. Upload an image and I'll help you edit it with AI. You can also ask me questions about your images or get editing suggestions!",
      sender: "agent",
      timestamp: new Date(),
    },
  ]);

  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [images] = useState<ImageItem[]>([
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
  ]);

  const [state, _, isPending] = useActionState(GenerateAction, initialState);

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

  const handleChatMessage = (message: string) => {
    // Add user message with selected image metadata
    const selectedImageIds = Array.from(selectedImages);
    const imageMetadata =
      selectedImageIds.length > 0
        ? `\n\n**Selected Images:** ${selectedImageIds.join(", ")}`
        : "";

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message + imageMetadata,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI response (you can replace this with actual AI integration)
    setTimeout(() => {
      let aiResponse = `I understand you said: "${message}". I'm here to help with your image editing needs!`;

      if (selectedImageIds.length > 0) {
        const selectedImageTitles = selectedImageIds.map(
          (id) => images.find((img) => img.id === id)?.title || id,
        );
        aiResponse += `\n\nI can see you've selected: ${selectedImageTitles.join(", ")}. What would you like to do with these images?`;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: "agent",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleChatImageUpload = (file: File) => {
    // Add user message showing image upload
    const userMessage: Message = {
      id: Date.now().toString(),
      content: `📷 Uploaded image: ${file.name}`,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI response for image upload
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I see you've uploaded "${file.name}". I can help you edit this image! What would you like to do with it?`,
        sender: "agent",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-700 via-gray-950 to-black">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 p-6 min-h-screen">
        {/* Enhanced Header */}
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

        {/* Enhanced Image Gallery */}
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
              {images.map((image) => {
                const isSelected = selectedImages.has(image.id);
                return (
                  <div
                    key={image.id}
                    onClick={() => handleImageSelection(image.id)}
                    className={`
                      flex-shrink-0 flex flex-col gap-3
                      rounded-2xl
                      bg-white/5 backdrop-blur-xl
                      border-2 transition-all duration-300
                      shadow-xl p-4
                      cursor-pointer
                      w-[280px] sm:w-[320px] md:w-[280px] lg:w-[300px]
                      hover:scale-102 hover:shadow-2xl
                      ${
                        isSelected
                          ? "border-blue-500/60 bg-blue-500/10"
                          : "border-white/10 hover:border-white/20"
                      }
                    `}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Image Preview */}
                    <div className="relative">
                      <ImagePreview
                        imageUrl={image.url ?? state.url ?? null}
                        isPending={isPending}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl" />
                    </div>

                    {/* Image Info */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-200 text-lg">
                        {image.title}
                      </h3>
                      <div className="max-h-20 overflow-auto rounded-lg bg-black/20 backdrop-blur-xl border border-white/10 p-3 minimal-scrollbar">
                        <p className="text-sm leading-relaxed text-gray-300">
                          {image.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>ID: {image.id}</span>
                        <span>{image.timestamp.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Enhanced Chat Interface */}
        <div className="h-96 bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleChatMessage}
            onImageUpload={handleChatImageUpload}
            isPending={isPending}
          />
        </div>
      </div>
    </main>
  );
}
