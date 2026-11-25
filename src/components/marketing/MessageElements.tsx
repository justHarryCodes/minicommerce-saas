// On-screen version of the marketing elements (lib/email-elements.ts):
// the builders' live previews and the dashboard announcement banner use it,
// so what you see is what the email looks like.
import { Fragment } from "react";
import { allowedImage, parseBlocks, type Block } from "@/lib/email-elements";
import { themeById, type EmailTheme } from "@/lib/email-themes";

function Inline({ text, link }: { text: string; link: string }) {
  // **bold**, https links and line breaks; everything else is plain text (React escapes it)
  const parts = text.split(/(\*\*.+?\*\*|https:\/\/[^\s]+|\n)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p === "\n" ? (
          <br key={i} />
        ) : p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-bold text-zinc-900">{p.slice(2, -2)}</strong>
        ) : p.startsWith("https://") ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: link }}>{p}</a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function BlockView({ b, th, compact }: { b: Block; th: EmailTheme; compact: boolean }) {
  const text = compact ? "text-[13px]" : "text-[14px]";
  switch (b.kind) {
    case "para":
      return <p className={`${text} leading-relaxed text-zinc-600`}><Inline text={b.text} link={th.link} /></p>;
    case "steps":
      return (
        <ol className="space-y-1.5">
          {b.items.map((s, i) => (
            <li key={i} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: th.tint }}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-black" style={{ background: th.accent, color: th.onAccent }}>{i + 1}</span>
              <span className={`${text} leading-snug text-zinc-700`}><Inline text={s} link={th.link} /></span>
            </li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul className="space-y-1.5">
          {b.items.map((it, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[15px] font-black" style={it.icon ? { background: th.tint } : { background: th.accent, color: th.onAccent }}>{it.icon ?? "✓"}</span>
              <span className={`${text} leading-snug text-zinc-600`}><Inline text={it.text} link={th.link} /></span>
            </li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <p className={`${text} rounded-xl border-l-4 px-3 py-2.5 leading-relaxed text-zinc-700`} style={{ background: th.tint, borderColor: th.accent }}>
          {b.icon && <span className="mr-1.5 text-base">{b.icon}</span>}
          <Inline text={b.text} link={th.link} />
        </p>
      );
    case "tiles":
      return (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${b.items.length}, minmax(0, 1fr))` }}>
          {b.items.map((t, i) => (
            <div key={i} className="rounded-xl px-2 py-2.5 text-center" style={{ background: th.tint }}>
              <div className="text-xl leading-none">{t.icon}</div>
              <div className="mt-1.5 text-[12px] font-extrabold leading-tight text-zinc-900"><Inline text={t.title} link={th.link} /></div>
              {t.text && <div className="mt-0.5 text-[11px] leading-snug text-zinc-500"><Inline text={t.text} link={th.link} /></div>}
            </div>
          ))}
        </div>
      );
    case "image":
      // eslint-disable-next-line @next/next/no-img-element
      return allowedImage(b.url) ? <img src={b.url} alt={b.alt} className="w-full rounded-xl" loading="lazy" /> : null;
    case "divider":
      return <hr className="border-zinc-200" />;
  }
}

/** The message's elements (steps, icon rows, tips, tiles, pictures). */
export function MessageBody({ body, theme, compact = false }: { body: string; theme: string | EmailTheme | null | undefined; compact?: boolean }) {
  const th = typeof theme === "object" && theme ? theme : themeById(theme as string | null);
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {parseBlocks(body).map((b, i) => (
        <BlockView key={i} b={b} th={th} compact={compact} />
      ))}
    </div>
  );
}

/** Emoji badge + label, like the top of the email. */
export function MessageBadge({ theme, kicker }: { theme: EmailTheme; kicker?: string }) {
  const k = kicker ?? theme.kicker;
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl text-[22px]" style={{ background: theme.tint, border: `1px solid ${theme.accent}33` }}>{theme.emoji}</span>
      {k && <span className="text-[11px] font-extrabold uppercase tracking-[0.15em]" style={{ color: theme.link }}>{k}</span>}
    </div>
  );
}

/** A full email-style preview: accent bar, photo, badge, headline, elements, button. */
export function MessagePreview({
  theme,
  headline,
  body,
  cta,
  header,
  footer,
}: {
  theme: EmailTheme;
  headline: string;
  body: string;
  cta?: string | null;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200">
      <div className="h-1.5" style={{ background: theme.accent }} />
      <div className="space-y-3 p-4">
        {header}
        {theme.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={theme.image.replace("/upload/", "/upload/c_fill,g_auto,w_720,h_300,q_auto,f_auto/")} alt="" className="aspect-[12/5] w-full rounded-xl object-cover" />
        )}
        <MessageBadge theme={theme} />
        <p className="text-[17px] font-black leading-snug">{headline || "Your headline"}</p>
        <MessageBody body={body || "Your message…"} theme={theme} />
        {cta && (
          <span className="inline-block rounded-xl px-4 py-2 text-[13px] font-extrabold" style={{ background: theme.accent, color: theme.onAccent }}>
            {cta} →
          </span>
        )}
        {footer}
      </div>
    </div>
  );
}
