"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ChevronRight, ExternalLink, LogOut, Menu, Plus, Search, Settings } from "lucide-react";
import type { Store as StoreType } from "@/types";
import type { SessionUser } from "@/lib/auth";
import { allowedPath, type Role } from "@/lib/access-shared";
import { auth } from "@/lib/firebase-client";
import { useDashboardDrawer } from "@/lib/dashboard-drawer-store";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { pageTitle } from "./nav-config";
import CommandPalette, { NEW_ACTIONS } from "./CommandPalette";

interface Props {
  user: SessionUser;
  store: StoreType;
  role?: Role;
}

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "dukanigeria.com").replace(/^www\./, "");

/** Closes a popover on outside click / Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

const menuItem = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default function DashboardTopbar({ user, store, role = "owner" }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { title, parent } = pageTitle(pathname);
  const customDomain = store.customDomain ?? store.custom_domain;
  const storeUrl = customDomain ? `https://${customDomain}` : `https://${store.slug}.${ROOT}`;
  const { setOpen, setPaletteOpen } = useDashboardDrawer();
  const newMenu = usePopover();
  const userMenu = usePopover();
  const actions = NEW_ACTIONS.filter((a) => allowedPath(role, a.href));
  const name = user.displayName ?? user.email.split("@")[0];
  const initials = (user.displayName ?? user.email).split(/[\s@.]/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const [isMac, setIsMac] = useState(false);
  useEffect(() => setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);

  const logout = async () => {
    await signOut(auth);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  };

  return (
    <>
      {/* ── Mobile ── */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-2 border-b border-zinc-100 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        <button onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-900 dark:text-white">{title}</p>
        <button onClick={() => setPaletteOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800" aria-label="Search">
          <Search className="h-[18px] w-[18px]" />
        </button>
        <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800" aria-label="View store">
          <ExternalLink className="h-[18px] w-[18px]" />
        </a>
        <PushNotificationPrompt subjectType="vendor" />
      </header>

      {/* ── Desktop ── */}
      <header className="sticky top-0 z-20 hidden h-12 items-center gap-3 border-b border-zinc-100 bg-white/85 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85 lg:flex">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
          {parent && (
            <>
              <Link href={parent.href} className="truncate text-zinc-500 hover:text-zinc-900 dark:hover:text-white">{parent.label}</Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
            </>
          )}
          <h1 className="truncate font-bold text-zinc-900 dark:text-white">{title}</h1>
        </nav>

        <button
          onClick={() => setPaletteOpen(true)}
          className="mx-auto flex h-8 w-full max-w-md items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-[13px] text-zinc-400 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <Search className="h-3.5 w-3.5" />
          Search pages and actions…
          <kbd className="ml-auto rounded border border-zinc-200 bg-white px-1.5 text-[10px] font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">{isMac ? "⌘" : "Ctrl"} K</kbd>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          {actions.length > 0 && (
            <div className="relative" ref={newMenu.ref}>
              <button
                onClick={() => newMenu.setOpen(!newMenu.open)}
                aria-expanded={newMenu.open}
                className="flex h-8 items-center gap-1 rounded-lg bg-accent-400 px-2.5 text-[13px] font-bold text-black hover:bg-accent-500"
              >
                <Plus className="h-4 w-4" /> New
              </button>
              {newMenu.open && (
                <div className="absolute right-0 top-9 z-50 w-48 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  {actions.map((a) => (
                    <Link key={a.href} href={a.href} onClick={() => newMenu.setOpen(false)} className={menuItem}>
                      <a.icon className="h-4 w-4 text-zinc-400" /> {a.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <a href={storeUrl} target="_blank" rel="noopener noreferrer" title="View your store" className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white">
            <ExternalLink className="h-4 w-4" />
          </a>
          <PushNotificationPrompt subjectType="vendor" />

          <div className="relative" ref={userMenu.ref}>
            <button onClick={() => userMenu.setOpen(!userMenu.open)} aria-expanded={userMenu.open} aria-label="Account" className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white dark:bg-white dark:text-zinc-900">
              {initials}
            </button>
            {userMenu.open && (
              <div className="absolute right-0 top-9 z-50 w-56 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <div className="px-2 py-1.5">
                  <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-white">{name}</p>
                  <p className="truncate text-[11px] text-zinc-400">{user.email}</p>
                </div>
                <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                {allowedPath(role, "/dashboard/settings") && (
                  <Link href="/dashboard/settings" onClick={() => userMenu.setOpen(false)} className={menuItem}>
                    <Settings className="h-4 w-4 text-zinc-400" /> Settings
                  </Link>
                )}
                <button onClick={logout} className={menuItem + " hover:!text-red-600"}>
                  <LogOut className="h-4 w-4 text-zinc-400" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette role={role} storeUrl={storeUrl} />
    </>
  );
}
