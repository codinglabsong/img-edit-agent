"use client";

import { useState } from "react";

interface ImagePreviewProps {
  imageUrl: string | null;
}

export default function ImagePreview({ imageUrl }: ImagePreviewProps) {
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageError(false);
    console.log("Image loaded successfully:", imageUrl);
  };

  const handleImageError = () => {
    setImageError(true);
    console.error("Image failed to load:", imageUrl);
  };

  return (
    <div className="flex justify-center items-center w-full aspect-square border rounded-xl inset-0 bg-gradient-to-t from-gray-300/30 to-gray-400/30 shadow-sm">
      {imageUrl && imageUrl.trim() !== "" && !imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Generated image"
          className="object-contain w-full h-full rounded-xl"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : imageError ? (
        <div className="text-center p-4">
          <span className="text-red-400 text-sm">Failed to load image</span>
          <br />
          <span className="text-gray-500 text-xs">URL: {imageUrl}</span>
        </div>
      ) : (
        <span className="text-gray-500">Your image will appear here</span>
      )}
    </div>
  );
}
