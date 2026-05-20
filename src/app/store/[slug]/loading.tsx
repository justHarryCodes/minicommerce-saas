export default function StorefrontLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 animate-pulse">
      {/* Hero skeleton */}
      <div className="h-44 sm:h-60 rounded-2xl bg-surface-100 dark:bg-surface-800 mb-8" />

      {/* Section label */}
      <div className="h-3 w-24 bg-surface-100 dark:bg-surface-800 rounded-full mb-3" />
      <div className="h-5 w-40 bg-surface-100 dark:bg-surface-800 rounded-full mb-6" />

      {/* Product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800">
            <div className="aspect-square bg-surface-100 dark:bg-surface-800" />
            <div className="p-3 space-y-2">
              <div className="h-3.5 bg-surface-100 dark:bg-surface-800 rounded-full w-4/5" />
              <div className="h-3 bg-surface-100 dark:bg-surface-800 rounded-full w-3/5" />
              <div className="h-7 bg-surface-100 dark:bg-surface-800 rounded-xl mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
