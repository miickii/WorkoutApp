import { defineConfig, devices } from "@playwright/test";
const basePath = process.env.VITE_BASE_PATH || "/";
const previewUrl = `http://127.0.0.1:4317${basePath}`;
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: previewUrl,
    ...devices["iPhone 13"],
    browserName: "chromium",
  },
  webServer: {
    command: "npm run preview -- --port 4317",
    url: previewUrl,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "mobile-chromium" },
    { name: "mobile-webkit", use: { browserName: "webkit" } },
  ],
});
