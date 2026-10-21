// A miniature, CSS-only mock of a storefront in a given theme — used on the
// gallery cards so merchants can compare layouts without loading 18 iframes.

import { FONT_STACKS } from "@/lib/theme-presets";
import { readableOn } from "@/lib/themes/resolve";
import type { ResolvedTheme } from "@/lib/themes/types";

const RADIUS_PX = { none: 0, sm: 3, md: 5, lg: 7, xl: 10 } as const;

export default function ThemeThumbnail({ theme }: { theme: ResolvedTheme }) {
  const { tokens, layout } = theme;
  const dark = tokens.mode === "dark";
  const bg = dark ? tokens.backgroundDark : tokens.background;
  const ink = dark ? "#fafafa" : "#18181b";
  const muted = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)";
  const r = RADIUS_PX[tokens.radius];
  const accent = tokens.accent;
  const onAccent = readableOn(accent);
  const heading: React.CSSProperties = {
    fontFamily: FONT_STACKS[tokens.headingFont],
    fontWeight: tokens.headingStyle === "bold" ? 800 : tokens.headingStyle === "elegant" ? 500 : 400,
    textTransform: tokens.headingStyle === "condensed" ? "uppercase" : "none",
    letterSpacing: tokens.headingStyle === "condensed" ? "0.02em" : "-0.02em",
  };

  const isList = layout.card === "menu" || layout.card === "service";
  const cols = isList ? 2 : Math.min(layout.columns, 4);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: bg, color: ink }} aria-hidden>
      {/* nav */}
      {layout.header === "centered" ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2" style={{ borderBottom: `1px solid ${muted}` }}>
          <span className="h-1.5 w-3 rounded-full" style={{ background: muted }} />
          <span className="text-[10px]" style={heading}>Your Store</span>
          <span className="flex justify-end gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: muted }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${muted}` }}>
          <span className="shrink-0 text-[9px]" style={heading}>Your Store</span>
          {layout.header === "standard" ? (
            <span className="h-2 flex-1 rounded-full" style={{ background: muted }} />
          ) : (
            <span className="flex flex-1 gap-1">
              <span className="h-1 w-3 rounded-full" style={{ background: muted }} />
              <span className="h-1 w-3 rounded-full" style={{ background: muted }} />
            </span>
          )}
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: muted }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          </span>
        </div>
      )}

      {/* hero */}
      <div className="px-2.5 pt-2">
        {layout.hero === "fullbleed" && (
          <div className="flex h-[58px] items-end p-2 text-white" style={{ background: `linear-gradient(to top, rgba(0,0,0,.65), rgba(0,0,0,.1)), linear-gradient(135deg, ${accent}, #444)`, borderRadius: Math.max(r - 2, 0) }}>
            <span className="text-[13px] font-black leading-none" style={heading}>New collection</span>
          </div>
        )}
        {layout.hero === "split" && (
          <div className="grid h-[58px] grid-cols-[1.7fr_1fr] gap-1.5">
            <div style={{ background: muted, borderRadius: r }} />
            <div className="flex items-end p-1.5" style={{ background: accent, color: onAccent, borderRadius: r }}>
              <span className="text-[9px] font-black leading-none" style={heading}>Shop now</span>
            </div>
          </div>
        )}
        {layout.hero === "banner" && <div className="h-[58px]" style={{ background: `linear-gradient(90deg, ${accent}, ${muted})`, borderRadius: r }} />}
        {layout.hero === "centered" && (
          <div className="flex h-[58px] flex-col items-center justify-center gap-1" style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, borderRadius: r }}>
            <span className="text-[12px] font-black leading-none" style={heading}>Welcome in</span>
            <span className="h-2 w-10" style={{ background: accent, borderRadius: r }} />
          </div>
        )}
        {layout.hero === "minimal" && (
          <div className="flex h-[58px] flex-col justify-center gap-1" style={{ borderBottom: `1px solid ${muted}` }}>
            <span className="text-[15px] font-black leading-none" style={heading}>Less, but better.</span>
            <span className="h-1 w-16 rounded-full" style={{ background: muted }} />
          </div>
        )}
      </div>

      {/* categories */}
      <div className="flex gap-1.5 px-2.5 pt-2">
        {Array.from({ length: layout.categories === "cards" ? 3 : 5 }).map((_, i) => {
          if (layout.categories === "pills")
            return <span key={i} className="h-2.5 w-7" style={{ background: i === 0 ? accent : muted, borderRadius: 99 }} />;
          if (layout.categories === "cards")
            return <span key={i} className="h-7 flex-1" style={{ background: i === 0 ? accent : muted, borderRadius: r, opacity: i === 0 ? 0.8 : 1 }} />;
          return (
            <span
              key={i}
              className="h-5 w-5"
              style={{ background: i === 0 ? accent : muted, borderRadius: layout.categories === "circles" ? 99 : r }}
            />
          );
        })}
      </div>

      {/* products */}
      <div className="grid gap-1.5 px-2.5 pt-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols * 2 }).map((_, i) =>
          isList ? (
            <div key={i} className="flex items-center gap-1 p-1" style={{ border: `1px solid ${muted}`, borderRadius: r }}>
              {layout.card === "service" && <span className="h-5 w-5 shrink-0" style={{ background: muted, borderRadius: r }} />}
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="h-1 w-full rounded-full" style={{ background: ink, opacity: 0.6 }} />
                <span className="h-1 w-2/3 rounded-full" style={{ background: muted }} />
              </span>
              {layout.card === "menu" ? (
                <span className="relative h-5 w-5 shrink-0" style={{ background: muted, borderRadius: r }}>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full" style={{ background: accent }} />
                </span>
              ) : (
                <span className="h-2 w-4 shrink-0" style={{ background: accent, borderRadius: r }} />
              )}
            </div>
          ) : (
            <div key={i} className="flex flex-col gap-0.5" style={layout.card === "classic" ? { border: `1px solid ${muted}`, borderRadius: r, padding: 2 } : undefined}>
              <span
                className="relative w-full"
                style={{ background: muted, borderRadius: r, aspectRatio: layout.card === "editorial" ? "3 / 4" : "1 / 1" }}
              >
                {layout.card === "minimal" && <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full" style={{ background: accent }} />}
              </span>
              <span className="h-1 w-3/4 rounded-full" style={{ background: ink, opacity: 0.5 }} />
              {layout.card === "classic" && <span className="h-1.5 w-full" style={{ background: accent, borderRadius: r }} />}
            </div>
          ),
        )}
      </div>

      {/* footer */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-3"
        style={
          layout.footer === "bold"
            ? { height: 16, background: "#09090b" }
            : layout.footer === "standard"
              ? { height: 12, background: muted }
              : { height: 8, borderTop: `1px solid ${muted}`, background: bg }
        }
      >
        {layout.footer === "bold" && <span className="text-[7px] text-white" style={heading}>Your Store</span>}
      </div>
    </div>
  );
}
