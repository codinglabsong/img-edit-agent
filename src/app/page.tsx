"use client";

import { useState, useEffect } from "react";
import ChatInterface from "@/ui/chat-interface";
import ImageCard from "@/ui/image-card";
import { sendChatMessage, uploadImageToS3 } from "@/lib/actions";
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
    type: "sample",
  },
  {
    id: "img_002",
    url: null,
    title: "Sample Image 2",
    description:
      "Urban cityscape with modern architecture and vibrant street life.",
    timestamp: new Date(Date.now() - 43200000), // 12 hours ago
    type: "sample",
  },
  {
    id: "img_003",
    url: null,
    title: "Sample Image 3",
    description:
      "Portrait photography with dramatic lighting and artistic composition.",
    timestamp: new Date(),
    type: "sample",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<ImageItem[]>(SAMPLE_IMAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [userId] = useState(() => crypto.randomUUID());

  // Reusable scroll function
  const scrollToRight = () => {
    const scrollContainer = document.getElementById("image-scroll-container");
    if (scrollContainer) {
      scrollContainer.scrollLeft = scrollContainer.scrollWidth;
    }
  };

  // Scroll to the right end (newest images) on mount and window resize
  useEffect(() => {
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
    const selectedImageObjects = images.filter((img) =>
      selectedImageIds.includes(img.id),
    );

    // Add user message (without image metadata)
    const userMessage = createMessage(message, "user");
    addMessage(userMessage);

    // Set loading state
    setIsLoading(true);

    // Get AI response
    try {
      const apiResponse = await sendChatMessage({
        message,
        selected_images: selectedImageObjects,
        user_id: userId,
      });

      const aiMessage = createMessage(apiResponse.response, "agent");
      addMessage(aiMessage);

      // Handle generated image if present
      if (apiResponse.generated_image) {
        const generatedImage: ImageItem = {
          id: apiResponse.generated_image.id,
          url: apiResponse.generated_image.url,
          title: apiResponse.generated_image.title,
          description: apiResponse.generated_image.description,
          timestamp: new Date(apiResponse.generated_image.timestamp),
          type: "generated" as const,
        };

        // Add to images list
        setImages((prev) => [...prev, generatedImage]);

        // Scroll to show the new image
        setTimeout(scrollToRight, 100);
      }
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
    const imageId = crypto.randomUUID();
    const objectUrl = URL.createObjectURL(file);

    // Create uploaded image item with UUID
    const uploadedImage: ImageItem = {
      id: imageId,
      url: objectUrl,
      title: file.name.replace(/\.[^/.]+$/, ""),
      description: "Uploaded by You",
      timestamp: new Date(),
      type: "uploaded",
    };

    // Add to images list immediately for UI responsiveness
    setImages((prev) => [...prev, uploadedImage]);

    // Scroll to show the new image
    setTimeout(scrollToRight, 100);

    // Upload to S3 in the background
    const s3Result = await uploadImageToS3(file, imageId, userId);

    if (s3Result.success && s3Result.url) {
      console.log("S3 upload successful, updating image URL:", s3Result.url);

      // Update the image with S3 URL
      setImages((prev) =>
        prev.map((img) => {
          if (img.id === imageId) {
            console.log(
              "Updating image",
              imageId,
              "from",
              img.url,
              "to",
              s3Result.url,
            );
            return { ...img, url: s3Result.url! };
          }
          return img;
        }),
      );
      // Clean up object URL to prevent memory leak
      URL.revokeObjectURL(objectUrl);
    } else {
      console.error("S3 upload failed:", s3Result.error);
      // If S3 upload failed, keep the object URL but clean it up later
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000); // Clean up after 1 minute
    }

    const uploadMessage = `📷 Uploaded image: ${file.name}`;

    // Add user message
    const userMessage = createMessage(uploadMessage, "user");
    addMessage(userMessage);

    // Set loading state
    setIsLoading(true);

    // Get AI response
    try {
      // const apiResponse = await sendChatMessage({
      //   message: uploadMessage,
      //   selected_images: [],
      //   user_id: userId,
      // });

      // const aiMessage = createMessage(apiResponse.response, "agent");
      const aiMessage = createMessage(
        `"${file.name}" was uploaded successfully! Now select the images you want to edit and ask away!`,
        "agent",
      );
      addMessage(aiMessage);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const fallbackMessage = createMessage(
        `I see you've uploaded "${file.name}". However, I encountered an error while processing it. Please try again later!`,
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
