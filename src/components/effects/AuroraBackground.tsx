import { useSessionStore } from "@/stores/sessionStore";
import { cn } from "@/lib/utils";

export function AuroraBackground() {
  const { isBreakthroughActive } = useSessionStore();

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Ambient Aurora Layer */}
      <div
        className={cn(
          "absolute inset-0 opacity-40 mix-blend-screen",
          "aurora-ambient transition-all duration-3000",
          isBreakthroughActive && "aurora-breakthrough-active"
        )}
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, 
              hsl(var(--primary) / 0.3), 
              transparent 50%
            ),
            radial-gradient(ellipse 60% 40% at 80% 50%, 
              hsl(var(--spiral-accent) / 0.2), 
              transparent 50%
            ),
            radial-gradient(ellipse 50% 30% at 20% 80%, 
              hsl(var(--secondary) / 0.25), 
              transparent 50%
            )
          `,
          filter: "blur(60px)",
        }}
      />

      {/* Additional flowing layer */}
      <div
        className="absolute inset-0 opacity-20 mix-blend-screen aurora-flow"
        style={{
          background: `
            radial-gradient(ellipse 40% 60% at 30% 40%, 
              hsl(var(--spiral-glow) / 0.4), 
              transparent 60%
            ),
            radial-gradient(ellipse 50% 40% at 70% 60%, 
              hsl(var(--accent) / 0.3), 
              transparent 50%
            )
          `,
          filter: "blur(80px)",
        }}
      />
    </div>
  );
}
