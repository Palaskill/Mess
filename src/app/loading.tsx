import Skeleton from '@/components/ui/Skeleton';

export default function HomeLoading() {
  return (
    <div className="min-h-full pb-32">
      <div className="max-w-xl mx-auto px-4 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        {/* Header Skeleton */}
        <header>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-28 rounded-lg" />
                <Skeleton className="h-3.5 w-48 rounded-md" />
              </div>
            </div>
            <Skeleton className="w-20 h-10 rounded-2xl" />
          </div>

          {/* Quick stats pills */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </header>

        {/* Sessions Section Skeleton */}
        <section className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3.5 w-24 rounded-md" />
          </div>

          {/* 3 Session Card Skeletons */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-3/4 rounded-lg" />
                </div>
                <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
              </div>

              <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-14 rounded-md" />
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* FAB Skeleton */}
      <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 sm:right-6 z-40">
        <Skeleton className="w-36 h-12 rounded-full shadow-lg" />
      </div>
    </div>
  );
}
