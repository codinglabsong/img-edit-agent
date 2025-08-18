"use client";

import { useState, useActionState, useEffect } from "react";
import { GenerateAction } from "@/app/action";
import type { GenerateState } from "@/lib/definition";
import PromptInput from "@/ui/prompt-input";
import ImagePreview from "@/ui/image-preview";

const initialState: GenerateState = {
  url: null,
  error: null,
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [state, formAction, isPending] = useActionState(
    GenerateAction,
    initialState,
  );

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

  return (
    <main className="bg-gradient-to-br from-gray-600 via-gray-900 to-black">
      <div className="max-w-5xl mx-auto items-center flex flex-col gap-4 p-6 min-h-screen">
        <div className="bg-gray-600/20 backdrop-blur-xl rounded-xl p-2 shadow-2xl">
          <h1 className="text-2xl font-bold text-gray-200 px-2">
            AI Image Editor
          </h1>
        </div>

        <div
          className="w-full overflow-x-auto minimal-scrollbar"
          id="image-scroll-container"
        >
          {(() => {
            const items = [1, 2, 3];
            const flexClass =
              items.length === 1
                ? "flex justify-center gap-5 px-1 py-2"
                : "flex gap-5 px-1 py-2";
            return (
              <div className={flexClass}>
                {items.map((_, idx) => (
                  <div
                    key={idx}
                    className="
                      flex-shrink-0 flex flex-col gap-2
                      rounded-2xl
                      bg-gray-600/20 backdrop-blur-xl
                      border border-gray-700
                      shadow-lg
                      p-3
                      transition-transform
                      hover:scale-102
                      w-[80vw] sm:w-[40vw] md:w-[28vw] lg:w-[24vw]
                      max-w-xs
                    "
                  >
                    <ImagePreview
                      imageUrl={state.url ?? null}
                      isPending={isPending}
                    />
                    <div className="max-h-32 overflow-auto rounded-lg bg-gray-800/40 backdrop-blur-xl border border-gray-700/40 shadow-2xl text-gray-100 p-2 minimal-scrollbar">
                      <p className="text-sm leading-relaxed text-gray-400">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit.
                        Quisquam, quos. Lorem ipsum dolor sit amet consectetur
                        adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit
                        amet consectetur adipisicing elit. Quisquam, quos. Lorem
                        ipsum dolor sit amet consectetur adipisicing elit.
                        Quisquam, quos.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="w-full mt-5">
          <PromptInput
            prompt={prompt}
            setPrompt={setPrompt}
            formAction={formAction}
            isPending={isPending}
          />
          {state.error && (
            <p className="mt-2 text-sm text-red-600">{state.error}</p>
          )}
        </div>
      </div>
    </main>
  );
}
