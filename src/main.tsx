import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";

// PWA registration handled in vite.config.ts with auto-update mode

// CRITICAL: Wrap root render in try-catch to catch immediate boot failures
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  createRoot(rootElement).render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error("[FATAL] App failed to mount:", error);
  // Fallback if React completely fails
  document.body.innerHTML = '<div style="color:white;background:black;padding:20px;">Fatal Error: See logs</div>';
}
