import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => {
  const configuredBase = loadEnv(mode, ".", "VITE_").VITE_BASE_PATH || "/";
  // Pages provides its actual path, including custom-domain/root deployments.
  const path = configuredBase.split("/").filter(Boolean).join("/");
  const base = path ? `/${path}/` : "/";
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
        base,
        scope: base,
        includeAssets: [
          "exercises/*.svg",
          "icon-*.png",
          "apple-touch-icon.png",
        ],
        manifest: {
          name: "RepTrack",
          short_name: "RepTrack",
          description: "Your training. One set at a time.",
          theme_color: "#101411",
          background_color: "#101411",
          display: "standalone",
          id: base,
          start_url: base,
          scope: base,
          icons: [
            { src: `${base}icon-192.png`, sizes: "192x192", type: "image/png" },
            {
              src: `${base}icon-512.png`,
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  };
});
