import { defineConfig } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();

export default defineConfig({
  testDir: "./test/e2e",
  outputDir: "./output/playwright",
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: externalBaseUrl || "http://127.0.0.1:8788",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm run dev -- --port 8788",
        url: "http://127.0.0.1:8788/health",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
