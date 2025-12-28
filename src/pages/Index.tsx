import { SpiralChat } from "@/components/SpiralChat";
import { Toaster } from "@/components/ui/toaster";
import { AuroraBackground } from "@/components/effects/AuroraBackground";
import { BreakthroughOverlay } from "@/components/effects/BreakthroughOverlay";
import { UserMenu } from "@/components/auth/UserMenu";

const Index = () => {
  return (
    <div className="app-container flex min-h-screen flex-col">
      {/* Aurora background system */}
      <AuroraBackground />
      <BreakthroughOverlay />
      
      {/* Ambient background orbs */}
      <div className="ambient-orb w-96 h-96 bg-primary/30 top-0 left-0" />
      <div className="ambient-orb w-80 h-80 bg-secondary/20 bottom-20 right-10" style={{ animationDelay: '-5s' }} />
      <div className="ambient-orb w-64 h-64 bg-accent/20 top-1/2 left-1/3" style={{ animationDelay: '-10s' }} />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 px-6 py-4 glass-card rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                <span className="text-gradient-spiral">a</span>
                <span className="text-foreground">Spiral</span>
              </h1>
              <div className="absolute -bottom-1 left-0 h-0.5 w-full bg-gradient-to-r from-primary/50 via-secondary/50 to-transparent" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-fluid-sm text-muted-foreground font-display tracking-wide hidden sm:block">
              Decision Intelligence
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="relative z-10 flex-1">
        <SpiralChat />
      </main>

      <Toaster />
    </div>
  );
};

export default Index;
