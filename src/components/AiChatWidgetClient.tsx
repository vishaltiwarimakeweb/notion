"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { toast } from "react-toastify";

type ChatMessage = {
  _id?: string;
  message: string;
  sender: "user" | "assistant";
  sources?: { id: string; title: string }[];
};

export function AiChatWidgetClient() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || hasLoadedHistory) return;

    fetch("/api/ai/chat")
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        setHasLoadedHistory(true);
      })
      .catch(() => {
        toast.error("Failed to load chat history.");
      });
  }, [isOpen, hasLoadedHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;

    setInput("");
    setMessages((prev) => [...prev, { message: text, sender: "user" }]);
    setIsSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to send message.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { message: data.reply, sender: "assistant", sources: data.sources },
      ]);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <span className="text-sm font-semibold text-neutral-900 dark:text-white">
              Assistant
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Ask me about your workspaces and pages.
              </p>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={msg._id ?? i}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.sender === "user"
                      ? "ml-auto bg-indigo-600 text-white"
                      : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <p className="mt-1 text-xs opacity-70">
                      Based on: {msg.sources.map((s) => s.title).join(", ")}
                    </p>
                  )}
                </div>
              ))
            )}
            {isSending && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Thinking…</p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              disabled={isSending}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="rounded-lg bg-indigo-600 p-2 text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-500"
        aria-label="Toggle AI assistant"
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
