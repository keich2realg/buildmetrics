export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div className="h-7 w-56 bg-secondary rounded animate-pulse mb-2"></div>
      <div className="h-4 w-80 bg-secondary/60 rounded animate-pulse mb-6"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-border/60 rounded-lg p-5 bg-white shadow-sm space-y-3">
            <div className="h-5 w-3/4 bg-secondary rounded animate-pulse"></div>
            <div className="h-4 w-1/2 bg-secondary/60 rounded animate-pulse"></div>
            <div className="h-4 w-1/3 bg-secondary/40 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
