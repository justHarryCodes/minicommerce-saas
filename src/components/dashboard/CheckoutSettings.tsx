"use client";

// Settings blocks for checkout: delivery zones / pickup, pay on delivery and
// automatic customer messages. Rendered inside SettingsClient and saved
// with the rest of the store settings.

import { useState } from "react";
import { HandCoins, MessageSquare, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { zoneIdFor, type DeliveryZone } from "@/lib/delivery";

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm";
const sectionCls = "bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5";

/** Common Lagos/nationwide starting points merchants can tweak. */
const ZONE_TEMPLATES: { name: string; fee: number }[][] = [
  [
    { name: "Lagos Island (VI, Ikoyi, Lekki)", fee: 2500 },
    { name: "Lagos Mainland", fee: 3000 },
    { name: "Outside Lagos (South-West)", fee: 5000 },
    { name: "Other states", fee: 7000 },
  ],
  [
    { name: "Within Abuja", fee: 2500 },
    { name: "Outside Abuja", fee: 6000 },
  ],
];

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-accent-400" : "bg-surface-200 dark:bg-surface-700"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
      <span>
        <span className="block text-sm font-medium text-surface-900 dark:text-white">{label}</span>
        {hint && <span className="block text-xs text-surface-400 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

/* ─────────────────────────── Delivery zones & pickup ─────────────────────────── */

export function DeliveryOptionsEditor({
  zones,
  freeDeliveryThreshold,
  pickupEnabled,
  pickupAddress,
  onChange,
}: {
  zones: DeliveryZone[];
  freeDeliveryThreshold: number | null;
  pickupEnabled: boolean;
  pickupAddress: string;
  onChange: (key: "deliveryZones" | "freeDeliveryThreshold" | "pickupEnabled" | "pickupAddress", value: unknown) => void;
}) {
  const [draftName, setDraftName] = useState("");
  const [draftFee, setDraftFee] = useState("");

  const setZones = (next: DeliveryZone[]) => onChange("deliveryZones", next);
  const addZone = (name: string, fee: number) => setZones([...zones, { id: zoneIdFor(name, zones), name, fee }]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Delivery areas &amp; fees</p>
        <p className="text-xs text-surface-400 mt-0.5 mb-3">
          Customers pick their area at checkout and the fee is added to their total. With no areas, delivery stays “to be arranged”.
        </p>

        {zones.length > 0 && (
          <ul className="space-y-2 mb-3">
            {zones.map((z, i) => (
              <li key={z.id} className="flex items-center gap-2">
                <input
                  value={z.name}
                  maxLength={60}
                  onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  className={`${inputCls} !py-2.5`}
                  aria-label="Area name"
                />
                <div className="relative w-36 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-surface-400">₦</span>
                  <input
                    type="number"
                    min={0}
                    value={z.fee}
                    onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, fee: Math.max(0, Number(e.target.value) || 0) } : x)))}
                    className={`${inputCls} !py-2.5 pl-7`}
                    aria-label="Delivery fee"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setZones(zones.filter((_, j) => j !== i))}
                  aria-label={`Remove ${z.name}`}
                  className="p-2 rounded-lg text-surface-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={60}
            placeholder="Area, e.g. Lekki / Ajah"
            className={`${inputCls} !py-2.5`}
          />
          <div className="relative w-36 shrink-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-surface-400">₦</span>
            <input
              type="number"
              min={0}
              value={draftFee}
              onChange={(e) => setDraftFee(e.target.value)}
              placeholder="Fee"
              className={`${inputCls} !py-2.5 pl-7`}
            />
          </div>
          <button
            type="button"
            disabled={!draftName.trim()}
            onClick={() => {
              addZone(draftName.trim(), Math.max(0, Number(draftFee) || 0));
              setDraftName("");
              setDraftFee("");
            }}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm font-semibold bg-surface-900 text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {zones.length === 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="text-xs text-surface-400">Quick start:</span>
            {ZONE_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setZones(tpl.reduce<DeliveryZone[]>((acc, z) => [...acc, { id: zoneIdFor(z.name, acc), ...z }], []))}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800"
              >
                {i === 0 ? "Lagos-based areas" : "Abuja-based areas"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Free delivery on orders over</label>
        <div className="relative max-w-xs">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-surface-400">₦</span>
          <input
            type="number"
            min={0}
            value={freeDeliveryThreshold ?? ""}
            onChange={(e) => onChange("freeDeliveryThreshold", e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
            placeholder="Leave empty for no free delivery"
            className={`${inputCls} pl-8`}
          />
        </div>
        <p className="text-xs text-surface-400 mt-1">Shoppers see how much more they need to add to unlock it.</p>
      </div>

      <div className="space-y-3 pt-1">
        <Toggle
          checked={pickupEnabled}
          onChange={(v) => onChange("pickupEnabled", v)}
          label="Allow pickup"
          hint="Customers can collect their order themselves — no delivery fee."
        />
        {pickupEnabled && (
          <input
            value={pickupAddress}
            onChange={(e) => onChange("pickupAddress", e.target.value)}
            maxLength={200}
            placeholder="Pickup address, e.g. 12 Admiralty Way, Lekki Phase 1"
            className={inputCls}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Pay on delivery ─────────────────────────── */

export function PayOnDeliveryEditor({
  enabled,
  depositPercent,
  onChange,
}: {
  enabled: boolean;
  depositPercent: number;
  onChange: (key: "podEnabled" | "podDepositPercent", value: unknown) => void;
}) {
  return (
    <section className={sectionCls}>
      <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
        <HandCoins className="w-4 h-4" />
        Pay on delivery
      </h2>
      <Toggle
        checked={enabled}
        onChange={(v) => onChange("podEnabled", v)}
        label="Let customers pay when their order arrives"
        hint="Many shoppers won't prepay a store they don't know yet — this usually lifts orders noticeably."
      />
      {enabled && (
        <div>
          <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Deposit required online</p>
          <div className="flex flex-wrap gap-2">
            {[0, 10, 20, 30, 50].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => onChange("podDepositPercent", pct)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  depositPercent === pct
                    ? "border-accent-400 bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300"
                    : "border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800"
                }`}
              >
                {pct === 0 ? "No deposit" : `${pct}%`}
              </button>
            ))}
          </div>
          <p className="text-xs text-surface-400 mt-2">
            {depositPercent === 0
              ? "Customers pay the full amount in cash or transfer on delivery."
              : `Customers pay ${depositPercent}% online via Paystack to confirm, and the rest on delivery. A deposit cuts fake orders and no-shows.`}
          </p>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────── Customer messages ─────────────────────────── */

export function CustomerMessagesEditor({
  enabled,
  messaging,
  onChange,
}: {
  enabled: boolean;
  messaging: { sms: boolean; email: boolean; included?: boolean };
  onChange: (key: "customerNotificationsEnabled", value: unknown) => void;
}) {
  const channels = [messaging.sms && "SMS", messaging.email && "email"].filter(Boolean).join(" and ");
  return (
    <section className={sectionCls}>
      <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Customer messages
      </h2>
      {messaging.included === false && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Automatic customer SMS & email are a Pro feature — nothing is sent on your current plan.{" "}
          <a href="/dashboard/billing" className="font-semibold underline">Upgrade</a>
        </p>
      )}
      <Toggle
        checked={enabled}
        onChange={(v) => onChange("customerNotificationsEnabled", v)}
        label="Send automatic order updates to customers"
        hint="Order received (with receipt link), payment received, on the way / ready for pickup, delivered and cancelled. Also one reminder for abandoned carts."
      />
      {channels ? (
        <p className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" /> Sending by {channels}.
        </p>
      ) : (
        <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Automatic SMS/email isn&apos;t switched on for the platform yet. You can still message customers in one tap from each order.
        </p>
      )}
    </section>
  );
}
