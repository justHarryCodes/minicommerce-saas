import { Fragment } from "react";
import { parseRichText, type Inline } from "@/lib/rich-text";

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) =>
        n.t === "text" ? (
          <Fragment key={i}>{n.v}</Fragment>
        ) : n.t === "bold" ? (
          <strong key={i} className="font-semibold text-surface-900 dark:text-white">
            <Inlines nodes={n.c} />
          </strong>
        ) : n.t === "italic" ? (
          <em key={i}>
            <Inlines nodes={n.c} />
          </em>
        ) : (
          <a
            key={i}
            href={n.href}
            className="font-medium underline decoration-[var(--sf-accent)] decoration-2 underline-offset-2 hover:opacity-80"
            {...(/^https?:/i.test(n.href) ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
          >
            <Inlines nodes={n.c} />
          </a>
        )
      )}
    </>
  );
}

function Lines({ lines }: { lines: Inline[][] }) {
  return (
    <>
      {lines.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          <Inlines nodes={l} />
        </Fragment>
      ))}
    </>
  );
}

/** Renders merchant-written page/post text (see lib/rich-text). */
export default function RichText({ source, className = "" }: { source: string; className?: string }) {
  const blocks = parseRichText(source);
  return (
    <div className={`space-y-4 text-[15px] leading-7 text-surface-700 dark:text-surface-300 ${className}`}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h": {
            const Tag = `h${b.level}` as "h2" | "h3" | "h4";
            const size = b.level === 2 ? "text-2xl mt-8" : b.level === 3 ? "text-xl mt-6" : "text-base mt-4";
            return (
              <Tag key={i} className={`sf-display font-bold text-surface-900 dark:text-white first:mt-0 ${size}`}>
                <Inlines nodes={b.c} />
              </Tag>
            );
          }
          case "p":
            return (
              <p key={i}>
                <Lines lines={b.c} />
              </p>
            );
          case "ul":
          case "ol": {
            const Tag = b.t;
            return (
              <Tag key={i} className={`space-y-1.5 pl-5 ${b.t === "ul" ? "list-disc" : "list-decimal"} marker:text-surface-400`}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inlines nodes={it} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return (
              <blockquote key={i} className="border-l-4 border-[var(--sf-accent)] pl-4 italic text-surface-600 dark:text-surface-400">
                <Lines lines={b.c} />
              </blockquote>
            );
          case "hr":
            return <hr key={i} className="border-surface-200 dark:border-surface-800" />;
        }
      })}
    </div>
  );
}
