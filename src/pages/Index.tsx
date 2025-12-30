import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SpiralChat } from "@/components/SpiralChat";
import { Toaster } from "@/components/ui/toaster";
import { AuroraBackground } from "@/components/effects/AuroraBackground";
import { BreakthroughOverlay } from "@/components/effects/BreakthroughOverlay";
import { FloatingParticles } from "@/components/effects/FloatingParticles";
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
      {/* Aurora background system - enhanced */}
      <AuroraBackground />
      <BreakthroughOverlay />
      
      {/* Floating particles for unified visual magic */}
      <FloatingParticles 
        primaryCount={isMobile ? 5 : 10} 
        secondaryCount={isMobile ? 3 : 6} 
        className="z-[1]" 
      />
      
      {/* Ambient background orbs with enhanced glow */}
      <motion.div 
        className="ambient-orb w-96 h-96 bg-primary/30 top-0 left-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 2 }}
        style={{ filter: "blur(80px)" }}
      />
      <motion.div 
        className="ambient-orb w-80 h-80 bg-secondary/25 bottom-20 right-10" 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 2, delay: 0.3 }}
        style={{ animationDelay: '-5s', filter: "blur(70px)" }} 
      />
      <motion.div 
        className="ambient-orb w-64 h-64 bg-accent/25 top-1/2 left-1/3" 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 2, delay: 0.6 }}
        style={{ animationDelay: '-10s', filter: "blur(60px)" }} 
      />
      
      {/* Header with enhanced glow on logo */}
      <header className="relative z-10 border-b border-border/50 px-6 py-4 glass-card rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img 
              src={aspiralLogo} 
              alt="aSpiral" 
              className="h-[2.78rem] drop-shadow-[0_0_12px_hsl(var(--primary)/0.7)] hover:drop-shadow-[0_0_18px_hsl(var(--primary)/0.9)] transition-all duration-300" 
            />
          </motion.div>
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-fluid-sm text-muted-foreground font-display tracking-wide hidden sm:block">
              Decision Intelligence
            </span>
            <UserMenu />
          </motion.div>
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

