// Device frames for the landing page's product screens.

export function Phone({
  children,
  className = "",
  dark = false,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`relative rounded-[2.6rem] bg-zinc-900 p-[9px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/10 ${className}`}
    >
      <div className={`relative h-full overflow-hidden rounded-[2.1rem] ${dark ? "bg-zinc-950" : "bg-white"}`}>
        {/* Dynamic island */}
        <div className="absolute left-1/2 top-2 z-20 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}

export function Browser({
  url,
  children,
  className = "",
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)] dark:border-white/10 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-100 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 flex-1 truncate rounded-md bg-white px-3 py-1 text-[11px] text-zinc-500">
          🔒 {url}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Phone status bar (time + signal) */
export function StatusBar({ light = false }: { light?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-6 pb-1 pt-2.5 text-[11px] font-semibold ${light ? "text-white" : "text-zinc-900"}`}>
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <span className="tracking-tighter">▂▄▆</span>
        <span className={`h-2.5 w-5 rounded-[3px] border ${light ? "border-white/80" : "border-zinc-900/80"} p-[1px]`}>
          <span className={`block h-full w-3/4 rounded-[1px] ${light ? "bg-white" : "bg-zinc-900"}`} />
        </span>
      </span>
    </div>
  );
}
