"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store-context";
import { formatPrice } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
  suggestedProducts?: { name: string; slug: string; price: number }[];
}

interface Props {
  storeSlug: string;
  storeName: string;
}

// Floating chat bubble + slide-in panel — same drawer pattern as
// CartDrawer/MenuDrawer, styled with the storefront's --sf-* CSS vars so it
// automatically matches each merchant's theme.
export default function AssistantWidget({ storeSlug, storeName }: Props) {
  const { storeBase } = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const nextMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`/api/storefront/${storeSlug}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setMessages((m) => [...m, { role: "assistant", content: data.reply, suggestedProducts: data.suggestedProducts }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: err instanceof Error ? err.message : "Sorry, I couldn't respond just now." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Launcher bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Ask a question"}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-transform hover:scale-105 active:scale-95"
        style={{ background: "var(--sf-accent)", color: "#000" }}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Panel */}
      <div
        className={`fixed bottom-24 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm h-[28rem] flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-3 pointer-events-none"
        }`}
        style={{ background: "var(--sf-bg)", boxShadow: "0 12px 40px rgba(0,0,0,0.2)", border: "1px solid var(--sf-border)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--sf-border)" }}>
          <Sparkles className="w-4 h-4" style={{ color: "var(--sf-accent)" }} />
          <span className="font-bold text-sm" style={{ color: "var(--sf-text)" }}>
            Ask {storeName}
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs" style={{ color: "var(--sf-muted)" }}>
              Ask about products, stock, or our return policy — I&apos;ll do my best to help.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug"
                style={
                  m.role === "user"
                    ? { background: "var(--sf-accent)", color: "#000" }
                    : { background: "var(--sf-surface)", color: "var(--sf-text)" }
                }
              >
                <p>{m.content}</p>
                {m.suggestedProducts && m.suggestedProducts.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.suggestedProducts.map((p) => (
                      <Link
                        key={p.slug}
                        href={`${storeBase}/products/${p.slug}`}
                        className="block text-xs font-semibold underline underline-offset-2"
                      >
                        {p.name} — {formatPrice(p.price)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl px-3.5 py-2 text-[13px]"
                style={{ background: "var(--sf-surface)", color: "var(--sf-muted)" }}
              >
                Typing…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2 p-3 border-t"
          style={{ borderColor: "var(--sf-border)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={sending}
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "var(--sf-surface)", color: "var(--sf-text)" }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send"
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40"
            style={{ background: "var(--sf-accent)", color: "#000" }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
}
