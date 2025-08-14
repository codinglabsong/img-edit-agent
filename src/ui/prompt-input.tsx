"use client";

interface PromptInputProps {
  value: string;
  onChange: (val: string) => void;
  formAction: (formData: FormData) => void;
  isPending: boolean;
}

export default function PromptInput({
  value,
  onChange,
  formAction,
  isPending,
}: PromptInputProps) {
  return (
    <form action={formAction} className="flex gap-2">
      <input
        name="prompt"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your prompt..."
        className="flex-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isPending}
      />
      <button
        type="submit"
        className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
        disabled={isPending}
      >
        {isPending ? "Generating..." : "Generate"}
      </button>
    </form>
  );
}
