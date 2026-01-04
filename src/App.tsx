import { useEffect, useState, useCallback } from "react";
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
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
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

// ============================================================================
// PWA Update Detection & Notification
// ============================================================================
function PWAUpdateHandler() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const handleUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [registration]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Listen for new service worker installation
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, show toast
                toast("New version available", {
                  description: "Refresh to get the latest features",
                  action: {
                    label: "Refresh",
                    onClick: handleUpdate,
                  },
                  duration: Infinity,
                });
              }
            });
          }
        });
      });

      // Handle controller change (when SKIP_WAITING is called)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, [handleUpdate]);

  return null;
}

// ============================================================================
// Standalone Mode Router - Bypass Landing for installed PWA
// ============================================================================
function StandaloneModeRedirect() {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Check if running as installed PWA (standalone mode)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error - Safari-specific property
    window.navigator.standalone === true;

  // If in standalone mode, authenticated, and on landing page, redirect to /app
  if (isStandalone && !loading && user && location.pathname === '/') {
    return <Navigate to="/app" replace />;
  }

  return null;
}

const App = () => (
  <I18nextProvider i18n={i18n}>
    <QueryClientProvider client={queryClient}>
      <SentinelProvider />
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Analytics />
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

export default App;
