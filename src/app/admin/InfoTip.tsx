"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

export function InfoTip({ content }: { content: string }) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <HelpCircle
        className="w-3.5 h-3.5 cursor-help"
        style={{ color: "var(--text-muted)" }}
        tabIndex={0}
        aria-label="Help"
      />
      {show && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 z-50 text-xs rounded-xl px-3 py-2.5 shadow-xl leading-relaxed pointer-events-none"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          {content}
          {/* Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2"
            style={{
              width: 0, height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid var(--text-primary)",
            }}
          />
        </div>
      )}
    </div>
  );
}
