"use client";

interface ImagePreviewProps {
  imageUrl: string | null;
  isPending: boolean;
}

export default function ImagePreview({
  imageUrl,
  isPending,
}: ImagePreviewProps) {
  return (
    <div className="flex justify-center items-center w-full aspect-square border rounded-lg bg-white shadow-sm">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Generated image"
          className="object-contain w-full h-full rounded-lg"
        />
      ) : isPending ? (
        <span className="text-gray-400">Generating...</span>
      ) : (
        <span className="text-gray-400">Your image will appear here</span>
      )}
    </div>
  );
}
