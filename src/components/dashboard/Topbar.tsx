import { Bell } from "lucide-react";
import type { Store } from "@/types";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  store: Store;
}

export default function DashboardTopbar({ user, store }: Props) {
  return (
    <header className="hidden lg:flex h-16 bg-white dark:bg-surface-900 border-b border-surface-100 dark:border-surface-800 items-center justify-between px-8">
      <div>
        <p className="text-xs text-surface-400 uppercase tracking-wider font-medium">
          Dashboard
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-600 transition-all">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent-400 flex items-center justify-center font-bold text-black text-sm">
            {user.displayName ?? user.email.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-surface-900 dark:text-white leading-tight">
              {user.displayName ?? user.email}
            </div>
            <div className="text-xs text-surface-400 leading-tight">{user.email}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
