"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Loader2, MessageCircle, Plus, Settings2, Trash2, UserX, Users, X } from "lucide-react";
import { addDays, lagosParts, weekdayOf, WEEKDAYS } from "@/lib/hours";
import { whatsappLink } from "@/lib/phone";
import { formatAppointment } from "@/lib/booking";

interface Booking {
  id: string;
  product_name: string;
  starts_at: string;
  ends_at: string;
  status: "confirmed" | "completed" | "cancelled" | "no_show";
  customer_name: string;
  customer_phone: string;
  staff_id: string | null;
  staff_name: string | null;
  order_number: string | null;
  payment_status: string | null;
}
interface Staff {
  id: string;
  name: string;
  role: string | null;
  productIds: string[];
}
interface Settings {
  slotMinutes: number;
  bufferMinutes: number;
  windowDays: number;
  minNoticeMinutes: number;
}

const STATUS: Record<Booking["status"], { label: string; tone: string }> = {
  confirmed: { label: "Confirmed", tone: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" },
  completed: { label: "Done", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
  cancelled: { label: "Cancelled", tone: "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400 line-through" },
  no_show: { label: "No-show", tone: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400" },
};

const timeOf = (iso: string) => {
  const m = lagosParts(new Date(iso)).minutes;
  const h = Math.floor(m / 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
};
const dayLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default function BookingsClient({
  storeId,
  storeName,
  today,
  services,
  initialStaff,
  settings: initialSettings,
}: {
  storeId: string;
  storeName: string;
  today: string;
  services: { id: string; name: string; duration_minutes: number | null }[];
  initialStaff: Staff[];
  settings: Settings;
}) {
  const [tab, setTab] = useState<"schedule" | "team" | "settings">("schedule");
  const [weekStart, setWeekStart] = useState(today);
  const [day, setDay] = useState(today);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [staff, setStaff] = useState<Staff[]>(initialStaff);

  const load = useCallback(async () => {
    setBookings(null);
    try {
      const res = await fetch(`/api/dashboard/bookings?from=${weekStart}&days=7`);
      const json = await res.json();
      setBookings(json.data ?? []);
    } catch {
      setBookings([]);
    }
  }, [weekStart]);
  useEffect(() => {
    load();
  }, [load]);

  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const perDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings ?? []) if (b.status === "confirmed") m.set(lagosParts(new Date(b.starts_at)).date, (m.get(lagosParts(new Date(b.starts_at)).date) ?? 0) + 1);
    return m;
  }, [bookings]);
  const dayBookings = (bookings ?? []).filter(
    (b) => lagosParts(new Date(b.starts_at)).date === day && (staffFilter === "all" || b.staff_id === staffFilter)
  );

  async function setStatus(b: Booking, status: Booking["status"]) {
    if (status === "cancelled" && !confirm(`Cancel ${b.customer_name}'s ${b.product_name}? The slot becomes free again.`)) return;
    const res = await fetch(`/api/dashboard/bookings/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    if (!res?.ok) return toast.error("Couldn't update");
    setBookings((list) => (list ?? []).map((x) => (x.id === b.id ? { ...x, status } : x)));
  }

  if (services.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-200 px-6 py-14 text-center dark:border-surface-700">
        <CalendarDays className="mx-auto h-8 w-8 text-surface-300" />
        <p className="mt-3 font-semibold text-surface-900 dark:text-white">No bookable services yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-surface-500 dark:text-surface-400">
          Open a product and switch on <strong>&ldquo;This is a bookable service&rdquo;</strong>. Customers will then pick a date and time on your store.
        </p>
        <Link href="/dashboard/products" className="mt-5 inline-block rounded-xl bg-accent-400 px-4 py-2 text-sm font-bold text-black">
          Go to products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          { id: "schedule", label: "Schedule", icon: CalendarDays },
          { id: "team", label: `Team (${staff.length})`, icon: Users },
          { id: "settings", label: "Booking rules", icon: Settings2 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === id ? "bg-surface-900 text-white dark:bg-white dark:text-black" : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "schedule" && (
        <>
          {/* Week strip */}
          <div className="flex items-center gap-2">
            <button onClick={() => { const s = addDays(weekStart, -7); setWeekStart(s); setDay(s); }} aria-label="Previous week" className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="grid flex-1 grid-cols-7 gap-1.5">
              {week.map((d) => (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  className={`rounded-xl px-1 py-2 text-center transition-colors ${
                    d === day ? "bg-surface-900 text-white dark:bg-white dark:text-black" : "bg-white text-surface-700 hover:bg-surface-50 dark:bg-surface-900 dark:text-surface-200 dark:hover:bg-surface-800"
                  } border border-surface-100 dark:border-surface-800`}
                >
                  <span className="block text-[11px] opacity-70">{WEEKDAYS[weekdayOf(d)].slice(0, 3)}</span>
                  <span className="block text-sm font-bold">{Number(d.slice(8))}</span>
                  <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${perDay.get(d) ? "bg-accent-400" : "bg-transparent"}`} />
                </button>
              ))}
            </div>
            <button onClick={() => { const s = addDays(weekStart, 7); setWeekStart(s); setDay(s); }} aria-label="Next week" className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-surface-900 dark:text-white">
              {day === today ? "Today" : dayLabel(day)} · {dayBookings.filter((b) => b.status === "confirmed").length} appointment{dayBookings.filter((b) => b.status === "confirmed").length === 1 ? "" : "s"}
            </p>
            {staff.length > 0 && (
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="rounded-xl border border-surface-200 bg-white px-3 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
              >
                <option value="all">Everyone</option>
                {staff.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
          </div>

          {bookings === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
          ) : dayBookings.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-surface-200 py-12 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">
              Nothing booked for this day.
            </p>
          ) : (
            <ul className="space-y-2">
              {dayBookings.map((b) => {
                const wa = whatsappLink(
                  b.customer_phone,
                  `Hi ${b.customer_name.split(/\s+/)[0]}! This is ${storeName} about your ${b.product_name} appointment on ${formatAppointment(b.starts_at)}.`
                );
                return (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-surface-100 bg-white px-4 py-3 dark:border-surface-800 dark:bg-surface-900">
                    <div className="w-20 shrink-0">
                      <p className="text-sm font-bold text-surface-900 dark:text-white">{timeOf(b.starts_at)}</p>
                      <p className="text-xs text-surface-400">to {timeOf(b.ends_at)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">{b.product_name}</p>
                      <p className="truncate text-xs text-surface-500 dark:text-surface-400">
                        {b.customer_name} · {b.customer_phone}
                        {b.staff_name ? ` · with ${b.staff_name}` : ""}
                        {b.order_number ? ` · ${b.order_number}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[b.status].tone}`}>{STATUS[b.status].label}</span>
                    <div className="flex items-center gap-1">
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp customer" className="rounded-lg p-1.5 text-[#128C7E] hover:bg-[#25D366]/10 dark:text-[#25D366]">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                      {b.status === "confirmed" && (
                        <>
                          <button onClick={() => setStatus(b, "completed")} title="Mark done" className="rounded-lg p-1.5 text-surface-400 hover:text-emerald-600">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setStatus(b, "no_show")} title="Didn't show up" className="rounded-lg p-1.5 text-surface-400 hover:text-amber-600">
                            <UserX className="h-4 w-4" />
                          </button>
                          <button onClick={() => setStatus(b, "cancelled")} title="Cancel" className="rounded-lg p-1.5 text-surface-400 hover:text-red-500">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {tab === "team" && <TeamTab staff={staff} setStaff={setStaff} services={services} />}
      {tab === "settings" && <RulesTab storeId={storeId} initial={initialSettings} />}
    </div>
  );
}

function TeamTab({ staff, setStaff, services }: { staff: Staff[]; setStaff: (s: Staff[]) => void; services: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/dashboard/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return toast.error(json?.error ?? "Couldn't add");
    setStaff([...staff, { id: json.data.id, name: json.data.name, role: json.data.role, productIds: [] }]);
    setName("");
    setRole("");
  }

  async function update(m: Staff, productIds: string[]) {
    setStaff(staff.map((x) => (x.id === m.id ? { ...x, productIds } : x)));
    const res = await fetch(`/api/dashboard/staff/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds }),
    }).catch(() => null);
    if (!res?.ok) toast.error("Couldn't save");
  }

  async function remove(m: Staff) {
    if (!confirm(`Remove ${m.name} from your team? Their past bookings stay on record.`)) return;
    const res = await fetch(`/api/dashboard/staff/${m.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return toast.error("Couldn't remove");
    setStaff(staff.filter((x) => x.id !== m.id));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-500 dark:text-surface-400">
        Without a team, your store takes one appointment at a time. Add people and each can be booked separately — customers can pick who they want, or get whoever is free.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Ada" maxLength={60} className="flex-1 rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:bg-surface-900 dark:text-white" />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional), e.g. Senior stylist" maxLength={60} className="flex-1 rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:bg-surface-900 dark:text-white" />
        <button onClick={add} disabled={busy || !name.trim()} className="flex items-center justify-center gap-1.5 rounded-xl bg-accent-400 px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
        </button>
      </div>
      <ul className="space-y-2">
        {staff.map((m) => (
          <li key={m.id} className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-surface-900 dark:text-white">{m.name}</p>
                {m.role && <p className="text-xs text-surface-500 dark:text-surface-400">{m.role}</p>}
              </div>
              <button onClick={() => remove(m)} aria-label={`Remove ${m.name}`} className="rounded-lg p-1.5 text-surface-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 mb-1.5 text-xs text-surface-500 dark:text-surface-400">Offers {m.productIds.length === 0 ? "all services" : `${m.productIds.length} service${m.productIds.length === 1 ? "" : "s"}`}:</p>
            <div className="flex flex-wrap gap-1.5">
              {services.map((s) => {
                const on = m.productIds.length === 0 || m.productIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      const current = m.productIds.length === 0 ? services.map((x) => x.id) : m.productIds;
                      const next = on ? current.filter((id) => id !== s.id) : [...current, s.id];
                      if (next.length === 0) return toast.error("Everyone needs at least one service");
                      update(m, next.length === services.length ? [] : next);
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      on ? "border-accent-400 bg-accent-50 text-accent-800 dark:bg-accent-950 dark:text-accent-300" : "border-surface-200 text-surface-400 dark:border-surface-700"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RulesTab({ storeId, initial }: { storeId: string; initial: Settings }) {
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const field = "rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-white";

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingSlotMinutes: s.slotMinutes,
        bookingBufferMinutes: s.bufferMinutes,
        bookingWindowDays: s.windowDays,
        bookingMinNoticeMinutes: s.minNoticeMinutes,
      }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) toast.success("Booking rules saved");
    else toast.error("Couldn't save");
  }

  return (
    <div className="space-y-4 rounded-2xl border border-surface-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
      <p className="flex items-start gap-2 text-sm text-surface-500 dark:text-surface-400">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        Bookable hours follow your opening hours in Settings (9am–6pm daily if you haven&apos;t set any). Each service&apos;s length is set on the product.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="block text-sm font-medium text-surface-700 dark:text-surface-300">Start times every</span>
          <select value={s.slotMinutes} onChange={(e) => setS({ ...s, slotMinutes: Number(e.target.value) })} className={field}>
            {[15, 30, 60].map((n) => <option key={n} value={n}>{n} minutes</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm font-medium text-surface-700 dark:text-surface-300">Break between appointments</span>
          <select value={s.bufferMinutes} onChange={(e) => setS({ ...s, bufferMinutes: Number(e.target.value) })} className={field}>
            {[0, 5, 10, 15, 30, 60].map((n) => <option key={n} value={n}>{n === 0 ? "None" : `${n} minutes`}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm font-medium text-surface-700 dark:text-surface-300">Minimum notice</span>
          <select value={s.minNoticeMinutes} onChange={(e) => setS({ ...s, minNoticeMinutes: Number(e.target.value) })} className={field}>
            {[[0, "None"], [30, "30 minutes"], [60, "1 hour"], [120, "2 hours"], [240, "4 hours"], [1440, "1 day"], [2880, "2 days"]].map(([n, l]) => <option key={n} value={n}>{l}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm font-medium text-surface-700 dark:text-surface-300">Customers can book up to</span>
          <select value={s.windowDays} onChange={(e) => setS({ ...s, windowDays: Number(e.target.value) })} className={field}>
            {[7, 14, 30, 60, 90].map((n) => <option key={n} value={n}>{n} days ahead</option>)}
          </select>
        </label>
      </div>
      <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-accent-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save rules
      </button>
    </div>
  );
}
