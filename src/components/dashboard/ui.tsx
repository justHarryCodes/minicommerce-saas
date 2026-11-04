// Compact building blocks for dashboard pages: tight spacing, small type,
// thin borders, so more fits on one screen. Server-safe (no hooks).
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Title row: short subtitle and actions on the right. The top bar already names the page. */
export function PageHeader({ title, subtitle, actions, className }: { title?: string; subtitle?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-end justify-between gap-2", className)}>
      <div className="min-w-0">
        {title && <h2 className="text-lg font-bold leading-tight text-zinc-900 dark:text-white">{title}</h2>}
        {subtitle && <p className="text-[13px] text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)}>
      {(title || action) && (
        <header className="flex h-10 items-center justify-between gap-2 border-b border-zinc-100 px-3 dark:border-zinc-800">
          <h3 className="truncate text-[13px] font-semibold text-zinc-900 dark:text-white">{title}</h3>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
      {children}
    </Link>
  );
}

/** One KPI: label, big number, change vs the previous period. */
export function Kpi({ label, value, delta, hint, href }: { label: string; value: string; delta?: number | null; hint?: string; href?: string }) {
  const up = (delta ?? 0) > 0;
  const body = (
    <>
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums leading-tight text-zinc-900 dark:text-white">{value}</p>
      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-zinc-500">
        {delta != null && delta !== 0 && (
          <span className={cn("inline-flex items-center font-semibold", up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint}
      </p>
    </>
  );
  const cls = "block rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-zinc-300 dark:hover:border-zinc-700")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** % change, or null when there's nothing to compare against. */
export function pctChange(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

const ORDER_TONES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  processing: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
  shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  cancelled: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function StatusPill({ status, className }: { status?: string | null; className?: string }) {
  const s = status ?? "pending";
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-px text-[11px] font-semibold capitalize leading-[18px]", ORDER_TONES[s] ?? ORDER_TONES.pending, className)}>
      {s}
    </span>
  );
}

const PAY: Record<string, { label: string; tone: string }> = {
  paid: { label: "Paid", tone: "text-emerald-600 dark:text-emerald-400" },
  deposit_paid: { label: "Deposit paid", tone: "text-emerald-600 dark:text-emerald-400" },
  pending: { label: "Unpaid", tone: "text-zinc-500" },
  pending_confirmation: { label: "Confirm transfer", tone: "text-orange-600 dark:text-orange-400 font-semibold" },
  failed: { label: "Failed", tone: "text-red-600" },
  rejected: { label: "Not received", tone: "text-red-600 font-semibold" },
};

export function PaymentText({ status, className }: { status?: string | null; className?: string }) {
  const p = PAY[status ?? "pending"] ?? { label: status ?? "", tone: "text-zinc-500" };
  return <span className={cn("text-[12px]", p.tone, className)}>{p.label}</span>;
}

/** "5m", "3h", "2d", else a short date. */
export function timeAgo(iso: string | Date | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.max(0, (now.getTime() - d.getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d`;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: React.ElementType; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <Icon className="mx-auto mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-700" />
      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</p>
      {text && <p className="mt-0.5 text-[13px] text-zinc-500">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
