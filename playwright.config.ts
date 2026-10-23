import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a running app connected to a Supabase project
 * with migrations and seed data applied (e.g. `supabase start` + `supabase db reset`).
 * Required env: E2E_BASE_URL (default http://localhost:3000), E2E_DATABASE_URL,
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (to prepare test users).
 * Email confirmation must be disabled (auto-confirm) in the test Supabase project.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /public\.spec\.ts/ },
  ],
});
