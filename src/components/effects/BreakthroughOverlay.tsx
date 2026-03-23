import { useEffect, useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { cn } from "@/lib/utils";

export function BreakthroughOverlay() {
  const { isBreakthroughActive } = useSessionStore();
  const [showFlash, setShowFlash] = useState(false);
  const [showAurora, setShowAurora] = useState(false);
  const [showRipples, setShowRipples] = useState(false);

  useEffect(() => {
    if (isBreakthroughActive) {
      // Sequence the effects
      setShowFlash(true);
      setShowAurora(true);
      setShowRipples(true);

      // Flash fades quickly
      const flashTimer = setTimeout(() => setShowFlash(false), 400);

      // Aurora and ripples fade after full animation - extended so entity is visible
      const auroraTimer = setTimeout(() => {
        setShowAurora(false);
        setShowRipples(false);
      }, 5000);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(auroraTimer);
      };
    }
  }, [isBreakthroughActive]);

  return (
    <>
      {/* White flash */}
      {showFlash && (
        <div className="fixed inset-0 bg-white z-[90] pointer-events-none animate-breakthrough-flash" />
      )}

      {/* Aurora explosion */}
      {showAurora && (
        <div
          className={cn(
            "fixed pointer-events-none z-50 mix-blend-screen",
            "aurora-breakthrough-explosion"
          )}
          style={{
            inset: "-50%",
            background: `
              radial-gradient(circle at 50% 50%, 
                hsl(var(--success) / 0.4) 0%,
                hsl(var(--primary) / 0.3) 30%,
                hsl(var(--spiral-glow) / 0.2) 60%,
                transparent 100%
              )
            `,
            filter: "blur(80px)",
          }}
        />
      )}

      {/* Ripple waves */}
      {showRipples && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="aurora-ripple-wave" style={{ animationDelay: "0s" }} />
          <div className="aurora-ripple-wave" style={{ animationDelay: "0.2s" }} />
          <div className="aurora-ripple-wave" style={{ animationDelay: "0.4s" }} />
        </div>
      )}
    </>
  );
}
