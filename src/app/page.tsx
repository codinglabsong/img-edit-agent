"use client";

import { useState, useEffect } from "react";
import ChatInterface from "@/ui/chat-interface";
import ImageCard from "@/ui/image-card";
import ExamplesDropdown from "@/ui/examples-dropdown";
import { sendChatMessage, uploadImageToS3 } from "@/lib/actions";
import type { Message, ImageItem } from "@/lib/types";

const INITIAL_MESSAGE: Message = {
  id: "initial-message",
  content:
    "Hi there! I'm Pablo, your AI image-editing assistant.\
     Upload an image or choose one from above, then tell me how you'd like it edited.\
     You can even select multiple images for reference. 🎨✨",
  sender: "agent",
  timestamp: new Date(), // Use current time instead of static timestamp
};

const SAMPLE_IMAGES: ImageItem[] = [
  {
    id: "sample_001",
    url: "https://img-edit-agent-bucket.s3.us-east-1.amazonaws.com/public/nyc_bw.png",
    title: "New York City at Night",
    description:
      "A black and white vintage photograph of New York City's skyline with the Empire State and Chrysler Buildings, film grain texture, and a timeless, classic feel.",
    timestamp: new Date(Date.now() - 86400000), // 1 day ago
    type: "sample",
  },
  {
    id: "sample_002",
    url: "https://img-edit-agent-bucket.s3.us-east-1.amazonaws.com/public/seoul_night.png",
    title: "Seoul Night",
    description:
      "A high-quality Canon night photo of a traditional street in Seoul, glowing street lamps lighting hanok houses, with Namsan Tower and modern skyscrapers in the distance.",
    timestamp: new Date(Date.now() - 43200000), // 12 hours ago
    type: "sample",
  },
  {
    id: "sample_003",
    url: "https://img-edit-agent-bucket.s3.us-east-1.amazonaws.com/public/picasso_woman.png",
    title: "Picasso Portrait",
    description:
      "An abstract Picasso-style portrait of a face in cool blue and teal tones, with geometric shapes, bold outlines, and a smooth modern finish.",
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

  // Scroll functions for arrow buttons
  const scrollLeft = () => {
    const scrollContainer = document.getElementById("image-scroll-container");
    if (scrollContainer) {
      scrollContainer.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    const scrollContainer = document.getElementById("image-scroll-container");
    if (scrollContainer) {
      scrollContainer.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  // Only scroll on window resize, not on initial load
  useEffect(() => {
    // Initial scroll to show newest images
    setTimeout(scrollToRight, 100);

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

    // Create message content with selected image references
    let messageContent = message;
    if (selectedImageObjects.length > 0) {
      const imageReferences = selectedImageObjects
        .map((img) => `📷 **${img.title}**`)
        .join("\n");
      messageContent = `${message}\n\n**Selected Images:**\n${imageReferences}`;
    }

    // Add user message with image metadata
    const userMessage = createMessage(messageContent, "user");
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

      // Handle generated image if present and has valid URL
      if (apiResponse.generated_image && apiResponse.generated_image.url) {
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

    // Auto-select the uploaded image
    setSelectedImages(() => new Set([imageId]));

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

    // Send automatic template response
    try {
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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-100 via-gray-950 to-black">
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto flex flex-col gap-6 p-6 min-h-full">
          {/* Header */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="p-1 text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  AI Image Editor
                </h1>
                <p className="text-gray-100 mt-1 text-sm sm:text-base">
                  Transform your images with AI-powered editing
                </p>
              </div>
            </div>
          </div>

          {/* Image Gallery */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-200">
                Your Gallery
              </h2>
              {selectedImages.size === 0 ? (
                <p className="text-sm text-gray-400 text-right">
                  Select or Scroll
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

            <div className="relative">
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
                  {/* add some space at the end to not interfere with ImageCard hover animation */}
                  <div className="hidden sm:block">-</div>
                </div>
              </div>
            </div>

            {/* Arrow Navigation Buttons */}
            <div className="flex justify-center mt-4 gap-16">
              <button
                onClick={scrollLeft}
                className="text-2xl text-gray-100 hover:text-white transition-colors duration-200 font-bold"
                aria-label="Scroll left"
              >
                &lt;
              </button>

              <button
                onClick={scrollRight}
                className="text-2xl text-gray-100 hover:text-white transition-colors duration-200 font-bold"
                aria-label="Scroll right"
              >
                &gt;
              </button>
            </div>
          </div>

          {/* Examples Dropdown */}
          <ExamplesDropdown />

          {/* Chat Interface */}
          <div className="h-[600px] bg-gray-700/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <ChatInterface
              messages={messages}
              onSendMessage={handleChatMessage}
              onImageUpload={handleChatImageUpload}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
