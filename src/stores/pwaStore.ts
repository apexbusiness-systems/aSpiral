import { create } from "zustand";
import type { BeforeInstallPromptEvent } from "@/lib/types";

interface PwaState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  setInstalled: (installed: boolean) => void;
}

export const usePwaStore = create<PwaState>((set) => ({
  deferredPrompt: null,
  isInstalled: false,
  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),
  setInstalled: (installed) => set({ isInstalled: installed }),
}));
