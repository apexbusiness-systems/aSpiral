/**
 * Shared ambient background with pulsing blobs and vignette overlay.
 * Used across public pages (Privacy, Support, etc.)
 *
 * "minimal" variant uses fewer blobs (e.g. Story page).
 */
export function AmbientBackground({ variant = "full" }: Readonly<{ variant?: "full" | "minimal" }>) {
  if (variant === "minimal") {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-primary/15 rounded-full blur-[100px] top-0 right-0 animate-pulse" />
        <div
          className="absolute w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[80px] bottom-1/4 left-0 animate-pulse"
          style={{ animationDelay: "3s" }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute w-[600px] h-[600px] bg-primary/12 rounded-full blur-[120px] -top-40 -right-40 animate-pulse" />
      <div
        className="absolute w-[500px] h-[500px] bg-secondary/8 rounded-full blur-[100px] bottom-0 -left-40 animate-pulse"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="absolute w-[400px] h-[400px] bg-primary/8 rounded-full blur-[80px] top-1/2 right-1/4 animate-pulse"
        style={{ animationDelay: "2s" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_50%,hsl(var(--background))_100%)]" />
    </div>
  );
}
