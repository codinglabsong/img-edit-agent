"use client";

import { useState, useActionState } from "react";
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

  return (
    <main className="min-h-screen p-6 bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-2xl">
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

      <div className="mt-8 w-full max-w-3xl">
        <ImagePreview imageUrl={state.url ?? null} isPending={isPending} />
      </div>
    </main>
  );
}
