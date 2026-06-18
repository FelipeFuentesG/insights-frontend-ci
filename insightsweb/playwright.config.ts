import { defineConfig, devices } from "@playwright/test";
import os from "os";
import path from "path";

const ARTIFACTS_DIR = path.join(os.tmpdir(), "playwright-insightsweb");
const OUTPUT_DIR = path.join(ARTIFACTS_DIR, "test-results");
const REPORT_DIR = path.join(ARTIFACTS_DIR, "playwright-report");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  outputDir: OUTPUT_DIR,
  reporter: [["list"], ["html", { open: "never", outputFolder: REPORT_DIR }]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
    screenshot: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
