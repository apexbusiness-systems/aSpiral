import { useCallback } from "react";
import { usePwaStore } from "@/stores/pwaStore";
import { useAnalytics } from "@/hooks/useAnalytics";

export function usePwaInstall() {
  const { deferredPrompt, setDeferredPrompt, isInstalled } = usePwaStore();
  const { trackFeature } = useAnalytics();

  const install = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn("[PWA] No deferred prompt available for installation");
      return;
    }

    trackFeature("pwa_install_prompt_triggered");

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      trackFeature("pwa_install_outcome", { outcome });

      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error("[PWA] Installation failed:", error);
    }
  }, [deferredPrompt, setDeferredPrompt, trackFeature]);

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    install,
    isInstalled,
  };
}
