import { Home, Mic, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

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

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 h-full",
                "transition-colors touch-manipulation",
                isActive ? "text-primary" : "text-muted-foreground"
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
                <tab.icon className="w-5 h-5" />
              </div>

              <span className="text-[10px] font-medium">{tab.label}</span>

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
