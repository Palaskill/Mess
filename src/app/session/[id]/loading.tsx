import Skeleton from '@/components/ui/Skeleton';

export default function SessionLoading() {
  return (
    <div className="min-h-full pb-36">
      <div className="max-w-xl mx-auto px-4 pt-2 sm:pt-4 space-y-4">
        {/* Top bar with back button & status */}
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="w-24 h-10 rounded-2xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-20 h-8 rounded-full" />
            <Skeleton className="w-16 h-8 rounded-2xl" />
          </div>
        </div>

        {/* Session Title Header */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-8 w-56 rounded-xl" />
          </div>
          <Skeleton className="h-3.5 w-36 rounded-md" />
        </div>

        {/* 3 Main Sticky Tabs Skeleton */}
        <div className="py-2.5 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-lg">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>

        {/* Tab Action Header Skeleton */}
        <div className="flex items-center justify-between pt-1">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-3.5 w-20 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24 rounded-2xl" />
            <Skeleton className="h-10 w-28 rounded-2xl" />
          </div>
        </div>

        {/* Order Cards Skeletons */}
        <div className="space-y-3.5 pt-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-md space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-32 rounded-md" />
                      <Skeleton className="h-4 w-8 rounded-md" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-16 rounded-md" />
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-md shrink-0" />
              </div>

              {/* Participant Assignment Chips Skeleton */}
              <div className="pt-2 border-t border-slate-700/50 flex items-center gap-2">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
