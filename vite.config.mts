import { fileURLToPath, URL } from "node:url";
import Vue from "@vitejs/plugin-vue";
import Fonts from "unplugin-fonts/vite";
import { defineConfig } from "vite";
import Vuetify, { transformAssetUrls } from "vite-plugin-vuetify";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    Vue({
      template: { transformAssetUrls },
    }),
    Vuetify({
      autoImport: true,
    }),
    Fonts({
      fontsource: {
        families: [
          {
            name: "Roboto",
            weights: [100, 300, 400, 500, 700, 900],
            styles: ["normal", "italic"],
          },
        ],
      },
    }),
    VitePWA({
      registerType: "prompt", // munculkan tombol "update tersedia" daripada auto-reload paksa
      includeAssets: ["favicon.ico", "pwa/*.png"],
      manifest: {
        name: "Manksi Web",
        short_name: "Manksi",
        description: "Manksi Web Application",
        theme_color: "#1e2327",
        background_color: "#ffffff",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        start_url: "/",
        scope: "/",
        orientation: "any",
        icons: [
          {
            src: "/pwa/manifest-icon-192.maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/pwa/manifest-icon-512.maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/pwa/apple-icon-180.png",
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // cache asset build (js/css/font) + cache CDN scripts yang dipakai di index.html
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cdn-libs-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // sesuaikan pola ini dengan base URL API kamu
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // set true kalau mau test service worker saat `npm run dev`
      },
    }),
  ],
  define: { "process.env": {} },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
    extensions: [".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".vue"],
  },
  server: {
    port: 3000,
  },
});
