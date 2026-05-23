export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fb] px-4">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="h-10 w-10 rounded-xl bg-secondary animate-pulse"></div>
        <div className="h-6 w-32 bg-secondary rounded animate-pulse"></div>
      </div>
      <div className="w-full max-w-lg border border-border/60 rounded-lg shadow-lg bg-white p-8 space-y-4">
        <div className="h-6 w-24 bg-secondary rounded animate-pulse mx-auto"></div>
        <div className="h-4 w-64 bg-secondary/60 rounded animate-pulse mx-auto"></div>
        <div className="space-y-3 pt-4">
          <div className="h-10 w-full bg-secondary/30 rounded animate-pulse"></div>
          <div className="h-10 w-full bg-secondary/30 rounded animate-pulse"></div>
          <div className="h-11 w-full bg-secondary/50 rounded animate-pulse mt-4"></div>
        </div>
      </div>
    </div>
  );
}
