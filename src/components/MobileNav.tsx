import { Home, Mic, History, Settings, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCallback, useRef, useState } from "react";

interface MobileNavProps {
  activeTab: "home" | "record" | "history" | "settings";
  onTabChange: (tab: "home" | "record" | "history" | "settings") => void;
  isRecording?: boolean;
  className?: string;
}

const tabs = [
  { id: "home" as const, icon: Home, label: "Home" },
  { id: "record" as const, icon: Mic, label: "Record" },
  { id: "history" as const, icon: History, label: "History" },
  { id: "settings" as const, icon: Settings, label: "Settings" },
];

export function MobileNav({ activeTab, onTabChange, isRecording, className }: MobileNavProps) {
  const isMobile = useIsMobile();
  const [pressedTab, setPressedTab] = useState<string | null>(null);
  
  // Debounce protection for reliable taps
  const lastTapRef = useRef<number>(0);
  const DEBOUNCE_MS = 150;

  const handleTabPress = useCallback((tabId: typeof tabs[number]["id"]) => {
    const now = Date.now();
    if (now - lastTapRef.current < DEBOUNCE_MS) return;
    lastTapRef.current = now;
    onTabChange(tabId);
  }, [onTabChange]);

  if (!isMobile) return null;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-background/95 backdrop-blur-xl border-t border-border/50",
        "safe-area-pb", // iOS safe area
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isRecordTab = tab.id === "record";
          const isPressed = pressedTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab.id)}
              onPointerDown={() => setPressedTab(tab.id)}
              onPointerUp={() => setPressedTab(null)}
              onPointerLeave={() => setPressedTab(null)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 h-full",
                "transition-transform duration-75 touch-manipulation select-none",
                isActive ? "text-primary" : "text-muted-foreground",
                isPressed ? "scale-90" : "scale-100"
              )}
            >
              {/* Recording pulse indicator */}
              {isRecordTab && isRecording && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 1, opacity: 0.3 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <div className="w-10 h-10 rounded-full bg-destructive/50" />
                </motion.div>
              )}

              <div
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isRecordTab && isRecording && "bg-destructive text-destructive-foreground",
                  isActive && !isRecording && "bg-primary/10"
                )}
              >
                {isRecordTab && isRecording ? (
                  <Square className="w-5 h-5 fill-current" />
                ) : (
                  <tab.icon className="w-5 h-5" />
                )}
              </div>

              <span className="text-[10px] font-medium">
                {isRecordTab && isRecording ? "Stop" : tab.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

