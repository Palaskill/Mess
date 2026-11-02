import Skeleton from '@/components/ui/Skeleton';

export default function AdminLoading() {
  return (
    <div className="min-h-full pb-32">
      <div className="max-w-xl mx-auto px-4 pt-6 sm:pt-8 space-y-6">
        {/* Header Skeleton */}
        <header>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-36 rounded-lg" />
                <Skeleton className="h-3.5 w-52 rounded-md" />
              </div>
            </div>
            <Skeleton className="w-20 h-10 rounded-2xl" />
          </div>
        </header>

        {/* Action & Filter Bar Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 w-32 rounded-2xl" />
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>

        {/* Menu Items Skeletons */}
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-5 w-32 rounded-md" />
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="w-8 h-8 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
