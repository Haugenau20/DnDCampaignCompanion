// e2e/playwright.config.ts
import os from "os";
import path from "path";
import { defineConfig, devices } from "@playwright/test";
import { E2E, appBuildEnv, SIGNED_IN_STATE } from "./support/env";

/**
 * Where the journeys' build goes: outside the repo, so it never overwrites the
 * developer's build/, and so the dev server, which scans every .html file under
 * the repo for dependencies, never finds this one.
 */
const BUILD_DIR = path.join(os.tmpdir(), "dnd-campaign-companion-e2e-build");

/**
 * The browser journeys (T103). They drive the production build, served by
 * `vite preview`, against the emulators `npm --prefix firebase run test:e2e`
 * starts; `globalSetup` resets those and seeds the fixtures.
 *
 * `sign-in.setup.ts` is itself a journey: it signs in by magic link and saves
 * the signed-in browser, which every other journey starts from.
 *
 * One worker, no retries: the journeys share one seeded campaign, and a
 * journey that only passes on a second try has found something.
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"]],
  globalSetup: "./support/global-setup.ts",
  use: {
    baseURL: E2E.appUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "sign-in", testMatch: /sign-in\.setup\.ts/ },
    {
      name: "journeys",
      use: { ...devices["Desktop Chrome"], storageState: SIGNED_IN_STATE },
      dependencies: ["sign-in"],
    },
  ],
  webServer: {
    command: `npm run build -- --outDir "${BUILD_DIR}" --emptyOutDir && npx vite preview --outDir "${BUILD_DIR}" --port ${E2E.appPort}`,
    cwd: "..",
    url: E2E.appUrl,
    env: appBuildEnv,
    timeout: 240_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
  },
});
