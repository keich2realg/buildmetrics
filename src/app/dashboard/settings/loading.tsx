export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div className="border border-border/60 rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="h-6 w-44 bg-secondary rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-secondary/60 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-secondary/50 rounded animate-pulse"></div>
                <div className="h-10 w-full bg-secondary/30 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border border-border/60 rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="h-6 w-36 bg-secondary rounded animate-pulse"></div>
          <div className="h-4 w-80 bg-secondary/60 rounded animate-pulse"></div>
          <div className="h-12 w-48 bg-secondary/30 rounded animate-pulse mt-4"></div>
        </div>
      </div>
    </div>
  );
}
