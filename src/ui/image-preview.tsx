"use client";

import { useState } from "react";

interface ImagePreviewProps {
  imageUrl: string | null;
}

export default function ImagePreview({ imageUrl }: ImagePreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    console.log("Image loaded successfully:", imageUrl);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
    console.error("Image failed to load:", imageUrl);
  };

  return (
    <div className="flex justify-center items-center w-full aspect-square border rounded-lg bg-gray-300 shadow-sm">
      {imageUrl && imageUrl.trim() !== "" && !imageError ? (
        <img
          src={imageUrl}
          alt="Generated image"
          className="object-contain w-full h-full rounded-lg"
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
        <span className="text-gray-400">Your image will appear here</span>
      )}
    </div>
  );
}
