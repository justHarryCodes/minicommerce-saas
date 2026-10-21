"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { Copy, Loader2, Mail, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/access-shared";
import type { TeamMember } from "@/lib/team";

type MemberRole = TeamMember["role"];

const input =
  "w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:bg-surface-900 dark:text-white";

export default function TeamClient({ ownerEmail, members }: { ownerEmail: string; members: TeamMember[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("staff");
  const [busy, setBusy] = useState<string | null>(null);
  // Shown after an invite so the owner can also send it on WhatsApp
  const [lastLink, setLastLink] = useState<{ email: string; url: string; emailed: boolean } | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy("invite");
    const res = await fetch("/api/dashboard/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, role }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) return toast.error(data?.error ?? "Couldn't send the invitation");
    setLastLink({ email, url: data.inviteUrl, emailed: data.emailed });
    toast.success(data.emailed ? "Invitation emailed" : "Invitation created — share the link");
    setEmail("");
    setName("");
    router.refresh();
  }

  async function patch(id: string, body: object, label: string) {
    setBusy(id);
    const res = await fetch(`/api/dashboard/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) return toast.error(data?.error ?? "Couldn't update");
    if (data.inviteUrl) {
      const m = members.find((x) => x.id === id);
      setLastLink({ email: m?.email ?? "", url: data.inviteUrl, emailed: data.emailed });
    }
    toast.success(label);
    router.refresh();
  }

  async function remove(m: TeamMember) {
    if (!confirm(m.status === "active" ? `Remove ${m.name || m.email}? They lose access immediately.` : `Cancel the invitation to ${m.email}?`)) return;
    setBusy(m.id);
    const res = await fetch(`/api/dashboard/team/${m.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return toast.error("Couldn't remove");
    toast.success(m.status === "active" ? "Removed from team" : "Invitation cancelled");
    router.refresh();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Link copied"), () => toast.error("Couldn't copy"));
  }

  return (
    <div className="space-y-5">
      <form onSubmit={invite} className="space-y-3 rounded-2xl border border-surface-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <p className="flex items-center gap-2 font-semibold text-surface-900 dark:text-white">
          <UserPlus className="h-4 w-4" /> Invite someone
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={input} type="email" required placeholder="Their email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={input} placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["staff", "manager"] as const).map((r) => (
            <label
              key={r}
              className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                role === r
                  ? "border-accent-400 bg-accent-50 dark:border-accent-500 dark:bg-accent-900/20"
                  : "border-surface-200 hover:border-surface-300 dark:border-surface-700"
              }`}
            >
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
              <span className="text-sm font-semibold text-surface-900 dark:text-white">{ROLE_LABEL[r]}</span>
              <span className="mt-0.5 block text-xs text-surface-500 dark:text-surface-400">{ROLE_DESCRIPTION[r]}</span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy === "invite"}
          className="flex items-center gap-2 rounded-xl bg-accent-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-accent-500 disabled:opacity-50"
        >
          {busy === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send invitation
        </button>
      </form>

      {lastLink && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <p className="font-semibold text-blue-900 dark:text-blue-200">
            {lastLink.emailed ? `We emailed ${lastLink.email}.` : `Send this link to ${lastLink.email}.`} You can also share it directly:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2.5 py-1.5 text-xs text-surface-700 dark:bg-surface-900 dark:text-surface-300">{lastLink.url}</code>
            <button type="button" onClick={() => copy(lastLink.url)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join my store team on Duka: ${lastLink.url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:text-blue-300"
            >
              WhatsApp
            </a>
          </div>
          <p className="mt-2 text-xs text-blue-800/70 dark:text-blue-300/70">They must sign in with this exact email. The link works once and expires in 14 days.</p>
        </div>
      )}

      <ul className="divide-y divide-surface-100 overflow-hidden rounded-2xl border border-surface-100 bg-white dark:divide-surface-800 dark:border-surface-800 dark:bg-surface-900">
        <li className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">You</p>
            <p className="truncate text-xs text-surface-500 dark:text-surface-400">{ownerEmail}</p>
          </div>
          <span className="rounded-full bg-surface-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-white dark:text-black">Owner</span>
        </li>
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">{m.name || m.email}</p>
              <p className="truncate text-xs text-surface-500 dark:text-surface-400">
                {m.name ? `${m.email} · ` : ""}
                {m.status === "invited"
                  ? `Invited ${formatDistanceToNow(new Date(m.invited_at), { addSuffix: true })}`
                  : m.last_seen_at
                    ? `Active ${formatDistanceToNow(new Date(m.last_seen_at), { addSuffix: true })}`
                    : "Joined"}
              </p>
            </div>
            {m.status === "invited" && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">Pending</span>
            )}
            <select
              value={m.role}
              disabled={busy === m.id}
              onChange={(e) => patch(m.id, { role: e.target.value }, "Role updated")}
              className="rounded-lg border border-surface-200 bg-white px-2 py-1.5 text-xs font-semibold text-surface-800 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200"
              aria-label={`Role for ${m.email}`}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
            {m.status === "invited" && (
              <button
                type="button"
                disabled={busy === m.id}
                onClick={() => patch(m.id, { resend: true }, "New invitation sent")}
                title="Send a fresh link"
                className="rounded-lg p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              disabled={busy === m.id}
              onClick={() => remove(m)}
              title={m.status === "active" ? "Remove from team" : "Cancel invitation"}
              className="rounded-lg p-2 text-surface-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
            >
              {busy === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </li>
        ))}
      </ul>
      {members.length === 0 && (
        <p className="text-center text-sm text-surface-500 dark:text-surface-400">No team members yet. Invite a packer, cashier or manager above.</p>
      )}
    </div>
  );
}
