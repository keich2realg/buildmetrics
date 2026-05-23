export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-secondary animate-spin border-t-steel"></div>
      </div>
      <p className="text-sm text-muted-foreground font-medium animate-pulse">Chargement...</p>
    </div>
  );
}
