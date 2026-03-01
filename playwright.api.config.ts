import { defineConfig } from "@playwright/test";

const apiBase = process.env.E2E_API_BASE ?? "http://localhost:3000/api";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*-api-.*\.spec\.ts/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {},
  projects: [{ name: "api" }],
  // API 测试不启动前端；请先运行 npm run dev
});
