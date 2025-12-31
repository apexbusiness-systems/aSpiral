import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";

// CRITICAL: Wrap root render in try-catch to catch immediate boot failures
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  createRoot(rootElement).render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <Suspense fallback={<div style={{ background: '#4a1a6b', height: '100vh', width: '100vw' }} />}>
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
