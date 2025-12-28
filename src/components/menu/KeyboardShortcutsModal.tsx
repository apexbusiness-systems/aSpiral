import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { ASPIRAL_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const formatKey = (shortcut: typeof ASPIRAL_SHORTCUTS[keyof typeof ASPIRAL_SHORTCUTS]) => {
    const parts: string[] = [];
    if ('ctrl' in shortcut && shortcut.ctrl) parts.push("Ctrl");
    if ('shift' in shortcut && shortcut.shift) parts.push("Shift");
    if ('alt' in shortcut && shortcut.alt) parts.push("Alt");
    
    let key = shortcut.key;
    if (key === " ") key = "Space";
    if (key === ",") key = ",";
    if (key === "?") key = "?";
    parts.push(key.toUpperCase());
    
    return parts;
  };

  const shortcuts = [
    { ...ASPIRAL_SHORTCUTS.toggleMenu, label: "Toggle Menu" },
    { ...ASPIRAL_SHORTCUTS.pauseResume, label: "Pause / Resume" },
    { ...ASPIRAL_SHORTCUTS.skipBreakthrough, label: "Skip to Breakthrough" },
    { ...ASPIRAL_SHORTCUTS.save, label: "Save Progress" },
    { ...ASPIRAL_SHORTCUTS.stop, label: "Stop Session" },
    { ...ASPIRAL_SHORTCUTS.restart, label: "Restart Session" },
    { ...ASPIRAL_SHORTCUTS.export, label: "Export" },
    { ...ASPIRAL_SHORTCUTS.history, label: "View History" },
    { ...ASPIRAL_SHORTCUTS.settings, label: "Open Settings" },
    { ...ASPIRAL_SHORTCUTS.help, label: "Show Shortcuts" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-[90%] max-w-md bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Keyboard className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <motion.div
                    key={shortcut.key + ('ctrl' in shortcut && shortcut.ctrl ? '-ctrl' : '') + ('shift' in shortcut && shortcut.shift ? '-shift' : '')}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <span className="text-sm text-foreground">{shortcut.label}</span>
                    <div className="flex items-center gap-1">
                      {formatKey(shortcut).map((key, i) => (
                        <span key={i}>
                          <kbd className="px-2 py-1 text-xs font-mono bg-background border border-border rounded text-muted-foreground">
                            {key}
                          </kbd>
                          {i < formatKey(shortcut).length - 1 && (
                            <span className="text-muted-foreground mx-0.5">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/20">
              <p className="text-xs text-center text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-background border border-border rounded">ESC</kbd> or <kbd className="px-1.5 py-0.5 text-xs font-mono bg-background border border-border rounded">?</kbd> to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
