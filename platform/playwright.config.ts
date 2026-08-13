import { defineConfig } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();

if (!externalBaseUrl) {
  throw new Error(
    "PLAYWRIGHT_BASE_URL is required; E2E gates only run against an explicit isolated target.",
  );
}

export default defineConfig({
  testDir: "./test/e2e",
  outputDir: "./output/playwright",
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: externalBaseUrl,
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
