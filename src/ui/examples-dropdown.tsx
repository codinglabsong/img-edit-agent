"use client";

import { useState, useEffect } from "react";

// Data
const examples = [
  {
    title: "Night to Day",
    prompt:
      "AI-Improved Prompt: A high-quality Canon photo of a traditional street in Seoul during the daytime, \
      bathed in bright natural sunlight, with hanok houses under a clear blue sky, and Namsan Tower and modern \
      skyscrapers visible in the distance. Vibrant colors, crisp details, and a lively atmosphere.",
    beforeImage:
      "https://img-edit-agent-bucket.s3.us-east-1.amazonaws.com/public/seoul_night.png",
    afterImage:
      "https://img-edit-agent-bucket.s3.us-east-1.amazonaws.com/public/gen_seoul_day.png",
  },
  {
    title: "Artistic to Realistic",
    prompt:
      "AI-Improved Prompt: A realistic photograph of a professional woman, headshot, 30s, confident and approachable expression, \
      sharp focus on the eyes, soft and even studio lighting, subtle bokeh background of a modern office, wearing elegant business attire, \
      high-resolution, professional portrait photography style.",
    beforeImage:
      "https://img-edit-agent-bucket.s3.us-east-1.amazonaws.com/public/picasso_woman.png",
    afterImage:
      "https://img-edit-agent-bucket.s3.us-east-1.amazonaws.com/public/gen_woman.png",
  },
  {
    title: "Monochrome to Color",
    prompt:
      "AI-Improved Prompt: A vibrant, colorized vintage photograph of New York City's skyline at night, \
       showcasing the iconic Empire State and Chrysler Buildings illuminated with warm, glowing lights. \
       The scene captures the bustling energy of the city with reflections on wet streets, a rich, realistic color palette, \
       and a subtle film grain to maintain its classic, timeless feel. Cinematic night photography style.",
    beforeImage:
      "https://img-edit-agent-bucket.s3.us-east-1.amazonaws.com/public/nyc_bw.png",
    afterImage:
      "https://img-edit-agent-bucket.s3.us-east-1.amazonaws.com/public/gen_color_nyc.png",
  },
];

// Types
type DisplayState = "loading" | "image" | "error";

// Reusable Components
const Icon = ({ className, path }: { className: string; path: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d={path}
    />
  </svg>
);

const ImagePlaceholder = ({
  color,
  label,
  imageUrl,
}: {
  color: string;
  label: string;
  imageUrl?: string;
}) => {
  const [displayState, setDisplayState] = useState<DisplayState>("loading");

  useEffect(() => {
    if (!imageUrl) {
      setDisplayState("loading");
      return;
    }

    const img = new Image();
    img.onload = () => setDisplayState("image");
    img.onerror = () => setDisplayState("error");
    img.src = imageUrl;
  }, [imageUrl]);

  const showImage = displayState === "image";
  const showPlaceholder = !showImage;

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${color} flex-shrink-0`}
        />
        <span className="text-xs sm:text-sm font-medium text-gray-300">
          {label}
        </span>
      </div>
      <div className="relative aspect-[4/3] sm:aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-white/20 min-h-[160px] sm:min-h-[180px]">
        {showImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        )}
        {showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <Icon
                className="w-8 h-8 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-2"
                path="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
              <span className="text-gray-500 text-xs sm:text-sm block">
                {displayState === "error"
                  ? "Image failed to load"
                  : "Image placeholder"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NavigationButton = ({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200 hover:scale-105 flex-shrink-0 cursor-pointer"
  >
    <Icon
      className="w-4 h-4 text-gray-300"
      path={direction === "prev" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
    />
  </button>
);

const DotIndicator = ({
  index,
  current,
  onClick,
}: {
  index: number;
  current: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-2 h-2 rounded-full transition-all duration-200 cursor-pointer ${
      index === current
        ? "bg-blue-500 scale-125"
        : "bg-gray-500 hover:bg-gray-400"
    }`}
  />
);

// Main Component
export default function ExamplesDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentExample, setCurrentExample] = useState(0);

  const nextExample = () =>
    setCurrentExample((current) => (current + 1) % examples.length);
  const prevExample = () =>
    setCurrentExample((current) =>
      current === 0 ? examples.length - 1 : current - 1,
    );

  const currentExampleData = examples[currentExample];

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-all duration-300 group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {/* <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-900 to-blue-600 flex items-center justify-center">
            <Icon
              className="w-4 h-4 text-white"
              path="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </div> */}
          <span className="text-lg font-semibold text-gray-200">
            View Examples
          </span>
        </div>
        <div
          className={`transform transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
        >
          <Icon
            className="w-5 h-5 text-gray-100 group-hover:text-white transition-colors"
            path="M19 9l-7 7-7-7"
          />
        </div>
      </button>

      {/* Content */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <NavigationButton direction="prev" onClick={prevExample} />
            <div className="text-center flex-1 px-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-200 mb-2">
                {currentExampleData.title}
              </h3>
              <div className="flex justify-center gap-2">
                {examples.map((_, index) => (
                  <DotIndicator
                    key={index}
                    index={index}
                    current={currentExample}
                    onClick={() => setCurrentExample(index)}
                  />
                ))}
              </div>
            </div>
            <NavigationButton direction="next" onClick={nextExample} />
          </div>

          {/* Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <ImagePlaceholder
              color="bg-red-500"
              label="Before"
              imageUrl={currentExampleData.beforeImage}
            />
            <ImagePlaceholder
              color="bg-green-500"
              label="After"
              imageUrl={currentExampleData.afterImage}
            />
          </div>

          {/* Prompt */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <Icon
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0"
                path="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
              <span className="text-xs sm:text-sm font-medium text-gray-300">
                Prompt Used
              </span>
            </div>
            <div className="bg-black/20 backdrop-blur-xl rounded-xl p-3 sm:p-4 border border-white/10">
              <p className="text-gray-200 leading-relaxed text-sm sm:text-base">
                &ldquo;{currentExampleData.prompt}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
