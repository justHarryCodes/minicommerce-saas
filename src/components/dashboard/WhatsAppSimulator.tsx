"use client";

// A WhatsApp look-alike chat where a store owner tries their own WhatsApp
// shop. Every message goes to /api/dashboard/whatsapp/simulate, which runs the
// real bot on the store's real products; nothing is sent on WhatsApp.

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCheck, ExternalLink, List, RotateCcw, SendHorizontal, ShoppingBag, X } from "lucide-react";
import type { WaOutgoing, WaRow } from "@/lib/meta/whatsapp";

type Inbound = { kind: "text"; text: string } | { kind: "reply"; id: string; title?: string };
type MsgBody = { me: true; text: string } | { me: false; out: WaOutgoing } | { note: string };
type Msg = MsgBody & { id: number; at: string };
type Sheet = { button: string; sections: { title?: string; rows: WaRow[] }[] };

const time = () => new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* WhatsApp text formatting: *bold*, _italic_, ~strike~, links, line breaks */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${n++}`;
    if (t.startsWith("http")) {
      out.push(
        <a key={k} href={t} target="_blank" rel="noopener noreferrer" className="break-all text-[#027eb5] underline">
          {t}
        </a>,
      );
    } else if (t[0] === "*") out.push(<strong key={k}>{t.slice(1, -1)}</strong>);
    else if (t[0] === "_") out.push(<em key={k}>{t.slice(1, -1)}</em>);
    else out.push(<s key={k}>{t.slice(1, -1)}</s>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
function WaText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((l, i) => (
        <Fragment key={i}>
          {inline(l, String(i))}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}

const ACTION = "flex w-full items-center justify-center gap-1.5 border-t border-zinc-200/80 py-2 text-[13px] font-medium text-[#008069] transition-colors hover:bg-zinc-50 disabled:opacity-50";

function Meta({ at, footer }: { at: string; footer?: string }) {
  return (
    <div className="mt-1 flex items-end justify-between gap-3">
      <span className="text-[11px] text-zinc-500">{footer}</span>
      <span className="shrink-0 text-[10px] text-zinc-400">{at}</span>
    </div>
  );
}

function BotBubble({ out, at, busy, onReply, onSheet }: { out: WaOutgoing; at: string; busy: boolean; onReply: (id: string, title: string) => void; onSheet: (s: Sheet) => void }) {
  const shell = "w-[88%] overflow-hidden rounded-lg rounded-tl-none bg-white text-[13.5px] leading-snug text-zinc-900 shadow-sm";
  const body = (b: string, header?: ReactNode, footer?: string) => (
    <div className="px-2.5 pb-1.5 pt-2">
      {header}
      <WaText text={b} />
      <Meta at={at} footer={footer} />
    </div>
  );

  switch (out.kind) {
    case "text":
      return <div className={shell}>{body(out.text)}</div>;
    case "image":
      return (
        <div className={shell}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={out.image} alt="" className="h-48 w-full bg-zinc-100 object-cover" />
          {body(out.caption ?? "")}
        </div>
      );
    case "buttons":
      return (
        <div className={shell}>
          {out.header?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={out.header.image} alt="" className="h-48 w-full bg-zinc-100 object-cover" />
          )}
          {body(out.body, out.header?.text ? <p className="mb-1 font-bold">{out.header.text}</p> : null, out.footer)}
          {out.buttons.map((b) => (
            <button key={b.id} type="button" disabled={busy} onClick={() => onReply(b.id, b.title)} className={ACTION}>
              {b.title}
            </button>
          ))}
        </div>
      );
    case "list":
      return (
        <div className={shell}>
          {body(out.body, out.header ? <p className="mb-1 font-bold">{out.header}</p> : null, out.footer)}
          <button type="button" disabled={busy} onClick={() => onSheet({ button: out.button, sections: out.sections })} className={ACTION}>
            <List className="h-4 w-4" /> {out.button}
          </button>
        </div>
      );
    case "cta":
      return (
        <div className={shell}>
          {body(out.body, out.header ? <p className="mb-1 font-bold">{out.header}</p> : null, out.footer)}
          <a href={out.url} target="_blank" rel="noopener noreferrer" className={ACTION}>
            <ExternalLink className="h-4 w-4" /> {out.label}
          </a>
        </div>
      );
    default:
      // Native catalog messages only exist inside WhatsApp itself
      return <div className={shell}>{body("body" in out && out.body ? out.body : "🛍️ Catalog")}</div>;
  }
}

export default function WhatsAppSimulator({ storeName }: { storeName: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [botState, setBotState] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [input, setInput] = useState("");
  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const push = (m: MsgBody) => setMsgs((list) => [...list, { ...m, id: nextId.current++, at: time() }]);

  async function send(message: Inbound, label: string) {
    if (busy) return;
    setSheet(null);
    push({ me: true, text: label });
    setBusy(true);
    setTyping(true);
    try {
      const res = await fetch("/api/dashboard/whatsapp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: botState, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      await wait(450); // a moment of "typing…", like the real thing
      setBotState(data.state ?? {});
      const replies: WaOutgoing[] = data.replies ?? [];
      for (let i = 0; i < replies.length; i++) {
        if (i) await wait(350);
        push({ me: false, out: replies[i] });
      }
      if (data.forwarded) push({ note: `📨 On WhatsApp, this message is sent to you as a notification: “${String(data.forwarded).slice(0, 120)}”` });
    } catch (e) {
      push({ note: `⚠️ ${e instanceof Error ? e.message : "Something went wrong"}` });
    } finally {
      setTyping(false);
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    void send({ kind: "text", text: t }, t);
  }

  function restart() {
    setMsgs([]);
    setBotState({});
    setSheet(null);
    setInput("");
  }

  return (
    <div className="relative mx-auto flex h-[620px] w-full max-w-[380px] flex-col overflow-hidden rounded-[28px] border-[6px] border-zinc-900 bg-[#efeae2] shadow-2xl dark:border-zinc-700">
      {/* Header */}
      <div className="flex items-center gap-2.5 bg-[#075e54] px-3 py-2.5 text-white">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-black">{storeName.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{storeName}</p>
          <p className="text-[11px] text-white/75">{typing ? "typing…" : "Business account"}</p>
        </div>
        <ShoppingBag className="h-5 w-5 text-white/90" />
        <button type="button" onClick={restart} title="Start over" aria-label="Start over" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Chat */}
      <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        <p className="mx-auto w-fit rounded-md bg-[#fff5c4] px-2.5 py-1 text-center text-[11px] text-zinc-600 shadow-sm">
          🔒 Preview: nothing here is sent on WhatsApp
        </p>
        {msgs.length === 0 && (
          <div className="mx-auto mt-10 max-w-[260px] rounded-xl bg-white/90 p-4 text-center text-sm text-zinc-600 shadow-sm">
            Chat with <strong className="text-zinc-900">{storeName}</strong> the way your customers will.
            <button type="button" onClick={() => send({ kind: "text", text: "Hi" }, "Hi 👋")} className="mt-3 w-full rounded-full bg-[#25D366] py-2 text-sm font-bold text-white hover:bg-[#1ebe5a]">
              Say hi 👋
            </button>
          </div>
        )}
        {msgs.map((m) =>
          "note" in m ? (
            <p key={m.id} className="mx-auto w-fit max-w-[90%] rounded-md bg-white/80 px-2.5 py-1 text-center text-[11px] text-zinc-600 shadow-sm">
              {m.note}
            </p>
          ) : m.me ? (
            <div key={m.id} className="ml-auto w-fit max-w-[80%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-2.5 py-1.5 text-[13.5px] text-zinc-900 shadow-sm">
              {m.text}
              <span className="ml-2 inline-flex translate-y-0.5 items-center gap-0.5 text-[10px] text-zinc-500">
                {m.at} <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
              </span>
            </div>
          ) : (
            <BotBubble key={m.id} out={m.out} at={m.at} busy={busy} onReply={(id, title) => send({ kind: "reply", id, title }, title)} onSheet={setSheet} />
          ),
        )}
        {typing && (
          <div className="flex w-fit gap-1 rounded-lg rounded-tl-none bg-white px-3 py-2.5 shadow-sm" aria-label="typing">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="flex items-center gap-2 bg-[#f0f2f5] px-2 py-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
          maxLength={500}
          className="min-w-0 flex-1 rounded-full bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#00a884] text-white disabled:opacity-50">
          <SendHorizontal className="h-5 w-5" />
        </button>
      </form>

      {/* List picker (WhatsApp's bottom sheet) */}
      {sheet && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/40" onClick={() => setSheet(null)}>
          <div className="max-h-[75%] overflow-y-auto rounded-t-2xl bg-white pb-2" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center gap-3 border-b border-zinc-100 bg-white px-4 py-3">
              <button type="button" onClick={() => setSheet(null)} aria-label="Close" className="text-zinc-500">
                <X className="h-5 w-5" />
              </button>
              <p className="flex-1 text-center text-[15px] font-semibold text-zinc-900">{sheet.button}</p>
              <span className="w-5" />
            </div>
            {sheet.sections.map((s, i) => (
              <div key={i}>
                {s.title && <p className="px-4 pb-1 pt-3 text-[12px] font-medium text-[#008069]">{s.title}</p>}
                {s.rows.map((r) => (
                  <button key={r.id} type="button" onClick={() => send({ kind: "reply", id: r.id, title: r.title }, r.title)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-50">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-zinc-900">{r.title}</span>
                      {r.description && <span className="block truncate text-[12px] text-zinc-500">{r.description}</span>}
                    </span>
                    <span className="h-4 w-4 shrink-0 rounded-full border-2 border-zinc-300" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
