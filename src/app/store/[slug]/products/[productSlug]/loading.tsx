export default function ProductLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="h-4 w-28 bg-surface-100 dark:bg-surface-800 rounded-full mb-8" />

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image skeleton */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl bg-surface-100 dark:bg-surface-800" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-16 h-16 rounded-xl bg-surface-100 dark:bg-surface-800 shrink-0" />
            ))}
          </div>
        </div>

        {/* Info skeleton */}
        <div className="space-y-4">
          <div className="h-3 w-20 bg-surface-100 dark:bg-surface-800 rounded-full" />
          <div className="h-8 bg-surface-100 dark:bg-surface-800 rounded-xl w-5/6" />
          <div className="h-6 bg-surface-100 dark:bg-surface-800 rounded-xl w-4/6" />
          <div className="h-10 bg-surface-100 dark:bg-surface-800 rounded-xl w-1/3" />
          <div className="space-y-2 pt-2">
            <div className="h-3.5 bg-surface-100 dark:bg-surface-800 rounded-full" />
            <div className="h-3.5 bg-surface-100 dark:bg-surface-800 rounded-full w-5/6" />
            <div className="h-3.5 bg-surface-100 dark:bg-surface-800 rounded-full w-4/6" />
          </div>
          <div className="h-12 bg-surface-100 dark:bg-surface-800 rounded-xl mt-4" />
          <div className="h-12 bg-surface-100 dark:bg-surface-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
