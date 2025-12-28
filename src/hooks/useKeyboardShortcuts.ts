import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const matchingShortcut = shortcuts.find((shortcut) => {
        if (shortcut.enabled === false) return false;

        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        return keyMatches && ctrlMatches && shiftMatches && altMatches;
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Predefined ASPIRAL shortcuts configuration
export const ASPIRAL_SHORTCUTS = {
  toggleMenu: { key: "m", description: "Toggle menu" },
  pauseResume: { key: " ", description: "Pause/Resume" },
  skipBreakthrough: { key: "b", description: "Skip to breakthrough" },
  save: { key: "s", ctrl: true, description: "Save progress" },
  stop: { key: "Escape", description: "Stop session" },
  restart: { key: "r", ctrl: true, description: "Restart" },
  export: { key: "e", description: "Export" },
  history: { key: "h", description: "View history" },
  settings: { key: ",", description: "Settings" },
  help: { key: "?", shift: true, description: "Show shortcuts" },
};
