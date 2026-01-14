import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { configDefaults } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Production optimizations
  esbuild: {
    // CRITICAL FIX: Only drop logs/debug, KEEP errors and warnings for mobile debugging
    pure: mode === "production" ? ["console.log", "console.debug", "console.info"] : [],
    drop: mode === "production" ? ["debugger"] : [],
  },
  build: {
    // Source maps for error tracking in production
    sourcemap: mode === "production" ? "hidden" : true,
    // Optimize for production
    minify: mode === "production" ? "esbuild" : false,
    // Target modern browsers for smaller bundles
    target: "es2020",
  },
  test: {
    exclude: [...configDefaults.exclude, "supabase/functions/spiral-ai/**/*.test.ts"],
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icons/icon.svg",
        "icons/favicon-32x32.png",
        "icons/favicon-16x16.png",
        "icons/apple-touch-icon.png"
      ],
      manifest: {
        name: "aSpiral - Transform Confusion into Clarity",
        short_name: "aSpiral",
        description: "Voice-first AI coaching that visualizes your thoughts and guides you to breakthrough clarity",
        theme_color: "#4a1a6b",
        background_color: "#4a1a6b",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        id: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores: ["**/demo-video*", "**/aspiral-heromark*"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
