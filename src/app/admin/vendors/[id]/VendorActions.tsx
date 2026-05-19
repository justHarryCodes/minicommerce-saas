"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldOff, ShieldCheck, Shield, CheckCircle, XCircle, AlertTriangle, ClipboardCheck } from "lucide-react";
import { InfoTip } from "@/app/admin/InfoTip";

interface Props {
  storeId: string;
  currentStatus: string;
}

const ACTION_TIPS = {
  confirm_registration: "Approves the vendor's store after they have paid the setup fee. This makes their store live and visible to shoppers. Only confirm after you have reviewed the store details.",
  activate:   "Makes the store fully live. Products become visible to all shoppers and the vendor can receive orders immediately.",
  suspend:    "Hides the entire store and all its products from shoppers. The vendor can still log in but cannot receive new orders. Use this for payment issues or policy violations.",
  restrict:   "The vendor can log in and manage products, but new orders are blocked. Softer than a full suspension — use when you need to flag an account without taking it fully offline.",
};

export default function VendorActions({ storeId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const doAction = async (action: string, body: object, label: string) => {
    if (loading) return;
    setConfirm(null);
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/vendors/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
      } else {
        toast.success(`${label} — done`);
        router.refresh();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  };

  const busy = (key: string) => loading === key;
  const needsConfirm = (key: string) => confirm === key;

  function ActionButton({
    id,
    label,
    icon: Icon,
    iconColor,
    disabled,
    destructive,
    onConfirm,
  }: {
    id: string;
    label: string;
    icon: React.ElementType;
    iconColor: string;
    disabled?: boolean;
    destructive?: boolean;
    onConfirm: () => void;
  }) {
    const isConfirming = needsConfirm(id);
    const isBusy = busy(id);

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <button
            disabled={disabled || !!loading}
            onClick={() => (destructive && !isConfirming ? setConfirm(id) : onConfirm())}
            className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            {isBusy ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon className="w-4 h-4 shrink-0" style={{ color: iconColor }} />
            )}
            {isBusy ? `${label}…` : label}
          </button>
          <InfoTip content={ACTION_TIPS[id as keyof typeof ACTION_TIPS] ?? ""} />
        </div>

        {/* Inline confirmation for destructive actions */}
        {isConfirming && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "#ef444415", color: "#dc2626" }}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">Are you sure?</span>
            <button onClick={onConfirm}
              className="underline hover:no-underline font-bold">Yes</button>
            <span className="opacity-50">·</span>
            <button onClick={() => setConfirm(null)}
              className="underline hover:no-underline">Cancel</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-5 space-y-4"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}>

      {/* Header with guide */}
      <div>
        <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
          Quick Actions
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Hover the <span className="font-semibold">?</span> icons for details on each action.
        </p>
      </div>

      {/* Current status callout */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
        style={{
          background: currentStatus === "active" ? "#22c55e15"
            : currentStatus === "suspended" ? "#ef444415"
            : currentStatus === "restricted" ? "#f9731615"
            : currentStatus === "pending_approval" ? "#3b82f615"
            : "#f59e0b15",
          color: currentStatus === "active" ? "#16a34a"
            : currentStatus === "suspended" ? "#dc2626"
            : currentStatus === "restricted" ? "#ea580c"
            : currentStatus === "pending_approval" ? "#2563eb"
            : "#d97706",
        }}>
        <span>Current status:</span>
        <span className="capitalize">{currentStatus.replace(/_/g, " ")}</span>
      </div>

      {/* Account status */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}>Account Status</p>

        {currentStatus === "pending_approval" && (
          <ActionButton
            id="confirm_registration"
            label="Confirm Registration"
            icon={ClipboardCheck}
            iconColor="#22c55e"
            onConfirm={() => doAction("confirm_registration", { action: "confirm_registration" }, "Registration confirmed — store is now live")}
          />
        )}

        <ActionButton
          id="activate"
          label="Activate"
          icon={ShieldCheck}
          iconColor="#22c55e"
          disabled={currentStatus === "active" || currentStatus === "pending_approval"}
          onConfirm={() => doAction("activate", { action: "set_status", status: "active" }, "Vendor activated")}
        />
        <ActionButton
          id="suspend"
          label="Suspend Account"
          icon={ShieldOff}
          iconColor="#ef4444"
          destructive
          disabled={currentStatus === "suspended"}
          onConfirm={() => doAction("suspend", { action: "set_status", status: "suspended" }, "Vendor suspended")}
        />
        <ActionButton
          id="restrict"
          label="Restrict Selling"
          icon={Shield}
          iconColor="#f97316"
          destructive
          disabled={currentStatus === "restricted"}
          onConfirm={() => doAction("restrict", { action: "set_status", status: "restricted" }, "Vendor restricted")}
        />
      </div>

    </div>
  );
}
