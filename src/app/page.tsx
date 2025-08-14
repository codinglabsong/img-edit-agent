"use client";

import PromptInput from "@/ui/prompt-input";
import ImagePreview from "@/ui/image-preview";
import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleSubmit = () => {
    console.log("submit");
  };

  return (
    <main className="flex flex-col items-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-2xl">
        <PromptInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleSubmit}
        />
      </div>

      <div className="mt-8 w-full max-w-3xl">
        <ImagePreview imageUrl={imageUrl} />
      </div>
    </main>
  );
}
