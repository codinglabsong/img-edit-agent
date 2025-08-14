"use client";

interface PromptInputProps {
  prompt: string;
  setPrompt: (val: string) => void;
  formAction: (formData: FormData) => void;
  isPending: boolean;
}

export default function PromptInput({
  prompt,
  setPrompt,
  formAction,
  isPending,
}: PromptInputProps) {
  return (
    <form
      action={formAction}
      className="flex flex-col gap-2"
      encType="multipart/form-data"
    >
      <input
        name="prompt"
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt..."
        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isPending}
      />
      <input
        name="image"
        type="file"
        accept="image/*"
        placeholder="Upload an image..."
        className="p-2 border rounded-lg"
        disabled={isPending}
      />
      <button
        type="submit"
        className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-60 w-fit"
        disabled={isPending}
      >
        {isPending ? "Generating..." : "Generate"}
      </button>
    </form>
  );
}
