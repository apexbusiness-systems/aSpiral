import { useEffect, useState } from "react";
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

// Pages
import Landing from "./pages/Landing";
import HowItWorks from "./pages/HowItWorks";
import Story from "./pages/Story";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Sessions from "./pages/Sessions";
import Workspaces from "./pages/Workspaces";
import ApiKeys from "./pages/ApiKeys";
import AdminDashboard from "./pages/AdminDashboard";
import NotificationTest from "./pages/NotificationTest";
import NotFound from "./pages/NotFound";
import VoiceYourChaos from "./pages/steps/VoiceYourChaos";
import WatchItVisualize from "./pages/steps/WatchItVisualize";
import AnswerQuestions from "./pages/steps/AnswerQuestions";
import GetBreakthrough from "./pages/steps/GetBreakthrough";

const queryClient = new QueryClient();

/**
 * PWA Update Handler (Auto-Update Mode)
 */
function PWAUpdateHandler() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      console.log("[PWA] Controller changed - App updated");
      toast.success("App updated to latest version", { duration: 3000 });
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

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
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
    let unlocked = false;

    const handler = async () => {
      if (unlocked) return;
      unlocked = true;
      try {
        await unlockAudioFromGesture();
        if (import.meta.env.DEV) {
          console.info("[Audio] User gesture unlock completed");
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("[Audio] User gesture unlock failed", error);
        }
        toast.error("Audio unlock failed", {
          description: "Tap again to enable voice playback.",
        });
        unlocked = false;
        return;
      }
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
            <PWAUpdateHandler />

            <PremiumSplash isVisible={showSplash} />

            {/* PWA Install Prompt - visible banner for install CTA */}
            <PwaInstallPrompt />

            <HashRouter>
              <StandaloneModeRedirect />
              <DebugOverlay />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/story" element={<Story />} />
                <Route path="/steps/voice" element={<VoiceYourChaos />} />
                <Route path="/steps/visualize" element={<WatchItVisualize />} />
                <Route path="/steps/questions" element={<AnswerQuestions />} />
                <Route path="/steps/breakthrough" element={<GetBreakthrough />} />
                <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
                <Route path="/workspaces" element={<ProtectedRoute><Workspaces /></ProtectedRoute>} />
                <Route path="/api-keys" element={<ProtectedRoute><ApiKeys /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/notification-test" element={<NotificationTest />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
};

export default App;
