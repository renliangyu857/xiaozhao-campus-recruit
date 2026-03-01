import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const apiBase = process.env.E2E_API_BASE ?? "http://localhost:3000/api";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL,
    browserName: "chromium",
    headless: !!process.env.CI,
    viewport: { width: 1280, height: 720 },
    trace: "on-first-retry",
    video: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "api",
      testMatch: /.*-api-.*\.spec\.ts/,
      use: { extraHTTPHeaders: { "X-E2E-API-Base": apiBase } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
