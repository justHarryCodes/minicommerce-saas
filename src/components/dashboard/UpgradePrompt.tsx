import Link from "next/link";
import { Lock } from "lucide-react";

export function UpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-16 text-center">
      <Lock className="w-12 h-12 text-surface-200 dark:text-surface-700 mx-auto mb-4" />
      <h3 className="font-semibold text-surface-900 dark:text-white mb-2">
        {feature} is a Pro feature
      </h3>
      <p className="text-sm text-surface-400 mb-6">
        Upgrade to Pro to unlock {feature.toLowerCase()} and more.
      </p>
      <Link
        href="/dashboard/billing"
        className="inline-flex items-center gap-2 bg-accent-400 hover:bg-accent-500 text-black font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
      >
        Upgrade to Pro →
      </Link>
    </div>
  );
}
