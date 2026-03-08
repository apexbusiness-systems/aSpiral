import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n/config";
import { SentinelProvider } from "@/components/SentinelProvider";
import { Analytics } from "@vercel/analytics/react";
import { DebugOverlay } from "@/components/DebugOverlay";
import { toast } from "sonner";
import { SplashScreen } from '@capacitor/splash-screen';
import PremiumSplash from "@/components/PremiumSplash";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { unlockAudioFromGesture } from "@/lib/audioSession";
import { createLogger } from "@/lib/logger";
import { usePwaStore } from "@/stores/pwaStore";
import type { BeforeInstallPromptEvent } from "@/lib/types";

// Eagerly loaded pages (critical path)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages (code-split for smaller initial bundle)
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Story = lazy(() => import("./pages/Story"));
const Index = lazy(() => import("./pages/Index"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Workspaces = lazy(() => import("./pages/Workspaces"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Breakthroughs = lazy(() => import("./pages/Breakthroughs"));
const NotificationTest = lazy(() => import("./pages/NotificationTest"));
const Support = lazy(() => import("./pages/Support"));
const VoiceYourChaos = lazy(() => import("./pages/steps/VoiceYourChaos"));
const WatchItVisualize = lazy(() => import("./pages/steps/WatchItVisualize"));
const AnswerQuestions = lazy(() => import("./pages/steps/AnswerQuestions"));
const GetBreakthrough = lazy(() => import("./pages/steps/GetBreakthrough"));

const queryClient = new QueryClient();
const logger = createLogger('PWA');
const audioLogger = createLogger('Audio');

// Module-level flag to prevent race conditions across multiple event types
// (touchstart + pointerdown both fire on mobile taps)
let audioUnlockAttempted = false;

/**
 * PWA Update Handler (Auto-Update Mode)
 */
function PwaManager() {
  const { setDeferredPrompt, setInstalled } = usePwaStore();

  useEffect(() => {
    // 1. Service Worker Update Handler
    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => {
        logger.debug("Controller changed - App updated");
        toast.success("App updated to latest version", { duration: 3000 });
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  useEffect(() => {
    // 2. Install Prompt Handler
    const handleBeforeInstallPrompt = (e: Event) => {
      logger.debug("PWA install prompt deferred");
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 3. Installation Success Handler
    const handleAppInstalled = () => {
      logger.info("PWA successfully installed");
      setInstalled(true);
      setDeferredPrompt(null);
    };

    // 4. Initial check for standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setInstalled(isStandalone);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [setDeferredPrompt, setInstalled]);

  return null;
}

function StandaloneModeRedirect() {
  const location = useLocation();
  const { user, loading } = useAuth();

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  if (isStandalone && !loading && user && location.pathname === '/') {
    return <Navigate to="/app" replace />;
  }
  return null;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      // 1. Hide Native Splash IMMEDIATELY
      try {
        await SplashScreen.hide();
      } catch (e) {
        // Web environment - ignore
      }

      // 2. Keep React Splash visible for branding
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Exit animation
      setShowSplash(false);
    };

    initApp();
  }, []);

  useEffect(() => {
    // Use only 'pointerdown' - it fires for both mouse and touch on modern browsers
    // This prevents duplicate events from touchstart + pointerdown race condition
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown"];

    const handler = async () => {
      // Use module-level flag to prevent race conditions
      // (React StrictMode double-mount + multiple events can cause races)
      if (audioUnlockAttempted) return;
      audioUnlockAttempted = true;

      // Audio unlock is best-effort and silent - errors are logged but not shown to users
      // Users shouldn't see audio errors when just browsing; errors only matter when
      // they explicitly try to use voice features
      await unlockAudioFromGesture();
      audioLogger.debug("User gesture unlock attempted");
      cleanup();
    };

    const cleanup = () => {
      events.forEach((event) => window.removeEventListener(event, handler));
    };

    events.forEach((event) => window.addEventListener(event, handler, { passive: true }));
    return cleanup;
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        {/* <SentinelProvider /> */}
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Analytics />
            <PwaManager />

            <PremiumSplash isVisible={showSplash} />

            {/* PWA Install Prompt - visible banner for install CTA */}
            <PwaInstallPrompt />

            <HashRouter>
              <StandaloneModeRedirect />
              <DebugOverlay />
              <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/story" element={<Story />} />
                <Route path="/support" element={<Support />} />
                <Route path="/steps/voice" element={<VoiceYourChaos />} />
                <Route path="/steps/visualize" element={<WatchItVisualize />} />
                <Route path="/steps/questions" element={<AnswerQuestions />} />
                <Route path="/steps/breakthrough" element={<GetBreakthrough />} />
                <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
                <Route path="/workspaces" element={<ProtectedRoute><Workspaces /></ProtectedRoute>} />
                <Route path="/api-keys" element={<ProtectedRoute><ApiKeys /></ProtectedRoute>} />
                <Route path="/breakthroughs" element={<ProtectedRoute><Breakthroughs /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                {import.meta.env.DEV && <Route path="/notification-test" element={<NotificationTest />} />}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </HashRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
};

export default App;
