import ImagePreview from "@/ui/image-preview";
import type { ImageItem } from "@/lib/types";
import { downloadImage } from "@/lib/actions";

interface ImageCardProps {
  image: ImageItem;
  isSelected: boolean;
  fallbackImageUrl?: string | null;
  onSelect: (imageId: string) => void;
}

export default function ImageCard({
  image,
  isSelected,
  fallbackImageUrl,
  onSelect,
}: ImageCardProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card selection

    if (!image.url) return;

    try {
      // Determine file extension from URL
      let extension = "png";
      if (image.url.includes(".")) {
        const urlMatch = image.url.match(/\.(\w+)(?:[?#]|$)/);
        if (urlMatch) {
          extension = urlMatch[1];
        }
      }

      const filename = `${image.title || "image"}.${extension}`;

      // Use server action to download the image
      const result = await downloadImage(image.url);

      if (result.success && result.blob) {
        // Create blob URL and trigger download
        const url = window.URL.createObjectURL(result.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        console.error("Download failed:", result.error);
        // Fallback to opening in new tab
        window.open(image.url, "_blank");
      }
    } catch (error) {
      console.error("Error downloading image:", error);
      // Fallback to opening in new tab
      window.open(image.url, "_blank");
    }
  };

  return (
    <div
      onClick={() => onSelect(image.id)}
      className={`
        relative flex-shrink-0 flex flex-col gap-3 mt-2
        rounded-2xl
        bg-white/5 backdrop-blur-xl
        border-2 transition-all duration-300
        shadow-xl p-4
        cursor-pointer
        w-[280px] sm:w-[320px] md:w-[280px] lg:w-[300px]
        hover:scale-102 hover:shadow-2xl
        ${
          isSelected
            ? "border-blue-500/60 bg-blue-600/10"
            : "border-white/10 hover:border-white/20"
        }
      `}
    >
      {/* Selection Indicator */}
      <div
        className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center border border-white/50
    ${isSelected ? "bg-blue-600" : "bg-gray-600"}`}
      >
        <svg
          className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-200"}`}
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

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="cursor-pointer absolute top-3 left-3 w-7 h-7 bg-gray-600 hover:bg-gray-800 border border-white/50 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 backdrop-blur-sm z-10"
        aria-label="Download image"
        disabled={!image.url}
      >
        <svg
          className="w-4 h-4 text-gray-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </button>

      {/* Image Preview */}
      <div className="relative mt-8">
        <ImagePreview imageUrl={image.url ?? fallbackImageUrl ?? null} />
      </div>

      {/* Image Info */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-300 text-lg whitespace-nowrap overflow-hidden">
          <span className="inline-block animate-marquee">{image.title}</span>
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
}
