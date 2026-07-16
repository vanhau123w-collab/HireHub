import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    ...(process.env.CI ? {} : { channel: "msedge" as const }),
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "msedge" as const }),
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        ...(process.env.CI ? {} : { channel: "msedge" as const }),
      },
    },
  ],
});
