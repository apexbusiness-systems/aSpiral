import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7;

const isStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIosDevice = () => {
  const ua = navigator.userAgent.toLowerCase();
  const isAppleMobile = /iphone|ipad|ipod/.test(ua);
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isAppleMobile || isIpadOs;
};

const PwaInstallPrompt = () => {
  const { canInstall, install, isInstalled } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  const isiOS = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    const lastDismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (lastDismissed && Date.now() - lastDismissed < DISMISS_COOLDOWN_MS) {
      setDismissed(true);
    }
  }, []);

  if (isInstalled || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  const handleInstall = async () => {
    await install();
  };

  if (isiOS && !canInstall) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-white/15 bg-black/80 p-4 text-white shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Install aSpiral</p>
            <p className="text-xs text-white/70">
              Tap the Share button, then choose “Add to Home Screen.”
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-white/15 bg-black/80 p-4 text-white shadow-lg backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Install aSpiral</p>
          <p className="text-xs text-white/70">Get quick access from your home screen.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleDismiss}>
            Not now
          </Button>
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
