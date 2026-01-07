import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

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
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  const isiOS = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    const lastDismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (lastDismissed && Date.now() - lastDismissed < DISMISS_COOLDOWN_MS) {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    const updateInstalled = () => setInstalled(isStandaloneMode());
    updateInstalled();

    const media = window.matchMedia("(display-mode: standalone)");
    const onChange = () => updateInstalled();
    media.addEventListener("change", onChange);

    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      media.removeEventListener("change", onChange);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      if (installed) return;
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, [installed]);

  if (installed || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
    setPromptEvent(null);
  };

  const handleInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "dismissed") {
      handleDismiss();
    }
  };

  if (isiOS && !promptEvent) {
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

  if (!promptEvent) return null;

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
