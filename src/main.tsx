import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";

/**
 * AGGRESSIVE SERVICE WORKER UPDATE STRATEGY
 * - registerType: 'autoUpdate' in vite.config.ts enables skipWaiting + clientsClaim
 * - This callback handles the auto-reload when a new version is available
 * - Forces immediate update without user interaction to prevent "old build loop"
 */
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // New version available - reload immediately
    console.log("[PWA] New version detected, reloading...");
    updateSW(true); // Accept the update and activate new SW
  },
  onOfflineReady() {
    console.log("[PWA] App ready for offline use");
  },
  onRegisteredSW(swUrl, registration) {
    console.log("[PWA] Service Worker registered:", swUrl);
    // Check for updates every 60 seconds to catch new deployments quickly
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error("[PWA] Service Worker registration failed:", error);
  },
});

// CRITICAL: Wrap root render in try-catch to catch immediate boot failures
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  createRoot(rootElement).render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <Suspense fallback={<div style={{ background: "#4a1a6b", height: "100vh", width: "100vw" }} />}>
          <App />
        </Suspense>
      </GlobalErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error("[FATAL] App failed to mount:", error);
  // Fallback if React completely fails
  document.body.innerHTML = '<div style="color:white;background:black;padding:20px;">Fatal Error: See logs</div>';
}
