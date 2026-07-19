import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // In dev the API is proxied; in prod VITE_API_URL points to the real host.
  // Workbox must cache using the same origin as the request, so derive it.
  const apiBase = env.VITE_API_URL || "http://localhost:8000/api";

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt", // prompt user before applying SW update
        injectRegister: "auto",
        includeAssets: [
          "favicon.png",
          "apple-touch-icon.png",
          "icons/*.png",
          "offline.html",
        ],
        manifest: {
          id: "/",
          name: "BloodConnect — اهدای خون",
          short_name: "BloodConnect",
          description: "Peer-to-Peer Blood Donation Platform for Afghanistan",
          theme_color: "#C0392B",
          background_color: "#ffffff",
          display: "standalone",
          launch_handler: { client_mode: "focus-existing" },
          scope: "/",
          start_url: "/",
          orientation: "portrait",
          lang: "fa",
          dir: "rtl",
          categories: ["health", "medical"],
          icons: [
            { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
            { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
            { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
            { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
            { src: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
          screenshots: [
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              form_factor: "narrow",
              label: "BloodConnect Home",
            },
          ],
        },
        workbox: {
          // Pre-cache the app shell (JS, CSS, HTML, assets, icons)
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          // Never let Workbox touch the Firebase messaging SW or the offline page
          globIgnores: ["firebase-messaging-sw.js"],
          // Offline fallback for navigation requests
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//, /^\/admin\//],
          runtimeCaching: [
            // Geo data: province/district lists never change — cache forever
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith("/api/geo/") ||
                url.href.includes("/geo/"),
              handler: "CacheFirst",
              options: {
                cacheName: "geo-data",
                expiration: {
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                  maxEntries: 50,
                },
              },
            },
            // All other API calls: network first, fall back to cache for 5 min
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith("/api/") || url.href.includes(apiBase),
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 10,
                expiration: { maxAgeSeconds: 60 * 5, maxEntries: 100 },
              },
            },
            // Google Fonts
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: {
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                  maxEntries: 20,
                },
              },
            },
          ],
        },
        devOptions: {
          // Enabled so the manifest + service worker actually exist during
          // `npm run dev`. Without this, /manifest.webmanifest 404s and the
          // browser can never consider the site installable in dev mode.
          enabled: true,
          type: "module",
          suppressWarnings: true,
        },
      }),
    ],
    server: {
      port: 3000,
      proxy: {
        // All /api/* requests in dev → Laravel backend on 8000
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
    build: {
      target: "es2015",
      chunkSizeWarningLimit: 600,
    },
  };
});
