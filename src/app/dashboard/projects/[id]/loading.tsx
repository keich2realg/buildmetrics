export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-8 bg-secondary rounded animate-pulse"></div>
        <div className="h-7 w-64 bg-secondary rounded animate-pulse"></div>
      </div>
      <div className="border border-border/60 rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-center">
            <div className="h-5 w-40 bg-secondary rounded animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-9 w-24 bg-secondary/60 rounded animate-pulse"></div>
              <div className="h-9 w-20 bg-secondary/40 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="border-t border-border/40 pt-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="h-4 w-1/3 bg-secondary rounded animate-pulse"></div>
                <div className="h-4 w-1/6 bg-secondary/60 rounded animate-pulse"></div>
                <div className="h-4 w-1/6 bg-secondary/40 rounded animate-pulse"></div>
                <div className="h-4 w-1/6 bg-secondary/30 rounded animate-pulse ml-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}