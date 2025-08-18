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
      className="flex flex-col gap-5 items-center w-3/4 mx-auto"
      encType="multipart/form-data"
    >
      <label
        className="
          flex flex-col
          sm:flex-row sm:justify-between sm:items-center
          gap-4
          cursor-pointer p-3 border rounded-lg
          bg-gray-700/40 hover:bg-gray-700/80 backdrop-blur-xl border-gray-300/40 shadow-xl text-gray-400
          w-full
          focus-within:ring-2 focus-within:ring-gray-500
        "
      >
        <span className="mr-5">Edit this image...</span>
        <input
          name="image"
          type="file"
          accept="image/*"
          className="cursor-pointer p-3 border rounded-lg focus:ring-gray-500 bg-gray-600/20 hover:bg-gray-600/80 backdrop-blur-xl border-gray-600/40 shadow-xl text-gray-400"
          disabled={isPending}
        />
      </label>
      <input
        name="prompt"
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt..."
        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-700/40 hover:bg-gray-700/80 backdrop-blur-xl border-gray-300/40 shadow-xl text-gray-100"
        disabled={isPending}
      />
      <button
        type="submit"
        className="w-full cursor-pointer px-4 py-2 bg-white/70 hover:bg-white/80 backdrop-blur-xl text-gray-700 border-gray-300/40 shadow-xl rounded-lg"
        disabled={isPending}
      >
        {isPending ? "Generating..." : "Generate"}
      </button>
    </form>
  );
}
