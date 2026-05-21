const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ],
  webServer: [
    {
      command: "npm run dev:test --prefix backend",
      url: "http://127.0.0.1:4100/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: "npm run dev --prefix frontend -- --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      env: {
        VITE_API_URL: "http://127.0.0.1:4100/api"
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    }
  ]
});
