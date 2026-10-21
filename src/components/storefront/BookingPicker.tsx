"use client";

// Date strip + available times (+ optional "who") for a bookable service.
// Times come from /api/storefront/[slug]/slots, which uses the same slot
// maths as the order API — what's offered here is what checkout accepts.

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { addDays, formatClock, lagosParts, weekdayOf, WEEKDAYS } from "@/lib/hours";

export interface BookingSelection {
  startsAt: string;
  staffId: string | null;
  staffName: string | null;
}

interface Slot {
  start: string;
  staffIds: string[];
}

export default function BookingPicker({
  storeSlug,
  productId,
  durationMinutes,
  value,
  onChange,
}: {
  storeSlug: string;
  productId: string;
  durationMinutes: number | null;
  value: BookingSelection | null;
  onChange: (v: BookingSelection | null) => void;
}) {
  const today = lagosParts(new Date()).date;
  const [lastDate, setLastDate] = useState(addDays(today, 29));
  const [date, setDate] = useState(today);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [slots, setSlots] = useState<Slot[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    const qs = new URLSearchParams({ productId, date, ...(staffId ? { staffId } : {}) });
    fetch(`/api/storefront/${storeSlug}/slots?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setSlots(j.slots ?? []);
        setStaff(j.staff ?? []);
        if (j.lastDate) setLastDate(j.lastDate);
      })
      .catch(() => !cancelled && setSlots([]));
    return () => {
      cancelled = true;
    };
  }, [storeSlug, productId, date, staffId]);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = today; d <= lastDate && out.length < 60; d = addDays(d, 1)) out.push(d);
    return out;
  }, [today, lastDate]);

  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-surface-900 dark:text-white">
          <CalendarDays className="h-4 w-4" /> Choose a date
        </span>
        {durationMinutes && <span className="text-xs text-surface-500 dark:text-surface-400">{durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 ? ` ${durationMinutes % 60}m` : ""}` : `${durationMinutes} min`} appointment</span>}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((d) => {
          const active = d === date;
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDate(d);
                onChange(null);
              }}
              aria-pressed={active}
              className={`w-14 shrink-0 rounded-[var(--sf-radius-btn,12px)] border-2 py-2 text-center transition-colors ${
                active ? "text-[color:var(--sf-on-accent)]" : "border-surface-200 text-surface-700 hover:border-surface-400 dark:border-surface-700 dark:text-surface-200"
              }`}
              style={active ? { backgroundColor: "var(--sf-accent)", borderColor: "var(--sf-accent)" } : undefined}
            >
              <span className="block text-[11px] font-medium opacity-80">{d === today ? "Today" : WEEKDAYS[weekdayOf(d)].slice(0, 3)}</span>
              <span className="block text-base font-bold">{Number(d.slice(8))}</span>
            </button>
          );
        })}
      </div>

      {staff.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-bold text-surface-900 dark:text-white">With</p>
          <div className="flex flex-wrap gap-2">
            {[{ id: null as string | null, name: "Anyone available" }, ...staff].map((s) => {
              const active = staffId === s.id;
              return (
                <button
                  key={s.id ?? "any"}
                  type="button"
                  onClick={() => {
                    setStaffId(s.id);
                    onChange(null);
                  }}
                  className={`rounded-[var(--sf-radius-btn,12px)] border-2 px-3.5 py-2 text-sm font-semibold ${
                    active ? "text-[color:var(--sf-on-accent)]" : "border-surface-200 text-surface-700 dark:border-surface-700 dark:text-surface-200"
                  }`}
                  style={active ? { backgroundColor: "var(--sf-accent)", borderColor: "var(--sf-accent)" } : undefined}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-bold text-surface-900 dark:text-white">Choose a time</p>
        {slots === null ? (
          <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
        ) : slots.length === 0 ? (
          <p className="rounded-xl bg-surface-50 px-4 py-3 text-sm text-surface-500 dark:bg-surface-800 dark:text-surface-400">
            No times left on this day — try another date.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => {
              const active = value?.startsAt === s.start;
              return (
                <button
                  key={s.start}
                  type="button"
                  onClick={() => {
                    const pick = staffId ?? (s.staffIds[0] ?? null);
                    onChange({ startsAt: s.start, staffId: staffId, staffName: staffId ? staffName(staffId) : staff.length ? staffName(pick) : null });
                  }}
                  aria-pressed={active}
                  className={`rounded-[var(--sf-radius-btn,12px)] border-2 py-2.5 text-sm font-bold transition-colors ${
                    active ? "text-[color:var(--sf-on-accent)]" : "border-surface-200 text-surface-800 hover:border-surface-400 dark:border-surface-700 dark:text-surface-100"
                  }`}
                  style={active ? { backgroundColor: "var(--sf-accent)", borderColor: "var(--sf-accent)" } : undefined}
                >
                  {formatClock(lagosParts(new Date(s.start)).minutes)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
