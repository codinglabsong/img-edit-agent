"use client";

interface ImagePreviewProps {
  imageUrl: string | null;
}

export default function ImagePreview({ imageUrl }: ImagePreviewProps) {
  return (
    <div className="flex justify-center items-center w-full aspect-square border rounded-lg bg-gray-300 shadow-sm">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Generated image"
          className="object-contain w-full h-full rounded-lg"
        />
      ) : (
        <span className="text-gray-400">Your image will appear here</span>
      )}
    </div>
  );
}
