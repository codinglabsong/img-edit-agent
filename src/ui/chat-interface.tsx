"use client";

import { useState, useRef, useEffect } from "react";

export interface Message {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onImageUpload?: (file: File) => void;
  isPending?: boolean;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  onImageUpload,
  isPending = false,
}: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isPending) {
      onSendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
    // Reset the input value so the same file can be selected again
    e.target.value = "";
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="w-full h-full flex flex-col max-h-full">
      {/* Chat Header */}
      <div className="p-6 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-200">
              AI Assistant
            </h3>
            <p className="text-sm text-gray-400">
              Ask questions about your images
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto minimal-scrollbar p-6 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">Start a conversation with the AI agent</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg ${
                  message.sender === "user"
                    ? "bg-blue-600/80 text-white"
                    : "bg-gray-600/60 text-gray-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.sender === "agent" && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                      AI
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p
                      className={`text-xs mt-2 opacity-70 ${
                        message.sender === "user"
                          ? "text-blue-100"
                          : "text-gray-300"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                  {message.sender === "user" && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                      U
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-600/60 text-gray-200 rounded-2xl px-4 py-3 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                  AI
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 border-t border-white/10 bg-white/5"
      >
        <div className="flex gap-3">
          {/* Image Upload Button */}
          <label className="flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl cursor-pointer transition-all duration-200 hover:scale-105">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isPending}
            />
            <svg
              className="w-5 h-5 text-gray-300 hover:text-white transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </label>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 hover:bg-white/20 backdrop-blur-xl border-white/20 text-gray-100 placeholder-gray-400 transition-all duration-200"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isPending}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
