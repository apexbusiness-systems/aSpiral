import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SpiralChat } from "@/components/SpiralChat";
import { Toaster } from "@/components/ui/toaster";
import { AuroraBackground } from "@/components/effects/AuroraBackground";
import { BreakthroughOverlay } from "@/components/effects/BreakthroughOverlay";
import { UserMenu } from "@/components/auth/UserMenu";
import { MobileNav } from "@/components/MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSessionStore } from "@/stores/sessionStore";
import aspiralLogo from "@/assets/aspiral-logo.png";

type MobileTab = "home" | "record" | "history" | "settings";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [externalRecordingTrigger, setExternalRecordingTrigger] = useState<number>(0);
  
  // Get recording state from session store (shared with SpiralChat)
  const isRecording = useSessionStore((state) => state.isRecording);

  const handleTabChange = useCallback((tab: MobileTab) => {
    setActiveTab(tab);
    
    // Navigate based on tab
    switch (tab) {
      case "history":
        navigate("/sessions");
        break;
      case "settings":
        // Could open settings modal or navigate
        break;
      case "record":
        // Trigger recording toggle in SpiralChat via increment
        setExternalRecordingTrigger(prev => prev + 1);
        break;
      default:
        break;
    }
  }, [navigate]);

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
            <img 
              src={aspiralLogo} 
              alt="aSpiral" 
              className="h-[2.78rem] drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)] hover:drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)] transition-all duration-300" 
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-fluid-sm text-muted-foreground font-display tracking-wide hidden sm:block">
              Decision Intelligence
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Chat Area - add bottom padding on mobile for nav */}
      <main className={`relative z-10 flex-1 ${isMobile ? 'pb-16' : ''}`}>
        <SpiralChat externalRecordingTrigger={externalRecordingTrigger} />
      </main>

      {/* Mobile Navigation */}
      <MobileNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        isRecording={isRecording}
      />

      <Toaster />
    </div>
  );
};

export default Index;

