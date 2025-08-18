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
    <main className="p-6 flex flex-col gap-4 min-h-screen">
      <h1 className="text-2xl font-bold">AI Image Editor</h1>

      <div className="w-full">
        <ImagePreview imageUrl={state.url ?? null} isPending={isPending} />
      </div>

      <div className="w-full">
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
    </main>
  );
}
