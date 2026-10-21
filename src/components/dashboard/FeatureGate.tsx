import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { FEATURES, type Feature } from "@/lib/features-shared";
import { hasFeature } from "@/lib/plan";

/** Shown in place of a paid page when the store's plan doesn't include it. */
export function UpgradeRequired({ feature, canUpgrade = true }: { feature: Feature; canUpgrade?: boolean }) {
  const f = FEATURES[feature];
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-surface-100 bg-white p-8 text-center shadow-sm dark:border-surface-800 dark:bg-surface-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
        <Lock className="h-6 w-6" />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-accent-600 dark:text-accent-400">Pro feature</p>
      <h1 className="mt-1 text-xl font-bold text-surface-900 dark:text-white">{f.label}</h1>
      <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">{f.pitch}</p>
      {canUpgrade ? (
        <Link
          href="/dashboard/billing"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent-400 px-5 py-3 text-sm font-bold text-black hover:bg-accent-500"
        >
          <Sparkles className="h-4 w-4" /> Upgrade to unlock
        </Link>
      ) : (
        <p className="mt-6 text-sm text-surface-500 dark:text-surface-400">Ask the store owner to upgrade the plan.</p>
      )}
    </div>
  );
}

/**
 * For paid dashboard pages: `const gate = await featureGate(store.id, "pos"); if (gate) return gate;`
 * Runs on every page render, so it also holds on in-app navigation.
 */
export async function featureGate(storeId: string, feature: Feature, canUpgrade = true): Promise<React.ReactElement | null> {
  return (await hasFeature(storeId, feature)) ? null : <UpgradeRequired feature={feature} canUpgrade={canUpgrade} />;
}
