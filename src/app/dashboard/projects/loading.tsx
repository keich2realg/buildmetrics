export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-7 w-48 bg-secondary rounded animate-pulse mb-2"></div>
          <div className="h-4 w-72 bg-secondary/60 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-40 bg-secondary rounded animate-pulse"></div>
      </div>
      <div className="border border-border/60 rounded-lg shadow-sm overflow-hidden bg-white">
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-1/4 bg-secondary rounded animate-pulse"></div>
              <div className="h-4 w-1/6 bg-secondary/60 rounded animate-pulse"></div>
              <div className="h-4 w-1/6 bg-secondary/40 rounded animate-pulse ml-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
