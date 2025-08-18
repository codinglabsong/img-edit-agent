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
      className="flex flex-col gap-5 items-center w-full mx-auto"
      encType="multipart/form-data"
    >
      <div className="flex flex-col sm:flex-row gap-0 w-full mx-auto bg-gray-700/40 backdrop-blur-xl border border-gray-300/40 shadow-xl rounded-lg overflow-hidden">
        <div className="w-full sm:w-1/4 p-3 border-b sm:border-b-0 sm:border-r border-gray-300/40">
          <label className="flex flex-col items-center cursor-pointer text-gray-400 hover:text-gray-300 transition-colors">
            <span className="text-sm font-medium mb-2">Edit this image</span>
            <input
              name="image"
              type="file"
              accept="image/*"
              className="w-full text-xs cursor-pointer p-2 border rounded focus:ring-2 focus:ring-gray-500 bg-gray-600/20 hover:bg-gray-600/40 backdrop-blur-xl border-gray-600/40 text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-600/40 file:text-gray-300 hover:file:bg-gray-600/60"
              disabled={isPending}
            />
          </label>
        </div>

        <div className="w-full sm:w-3/4 p-3">
          <textarea
            name="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt..."
            rows={3}
            className="minimal-scrollbar w-full h-full min-h-[80px] resize-none p-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-600/20 hover:bg-gray-600/40 backdrop-blur-xl border-gray-600/40 text-gray-100 placeholder-gray-400"
            disabled={isPending}
          />
        </div>
      </div>
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
