import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 75_000,
  use: {
    baseURL: "http://127.0.0.1:4173/firstsong/",
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/serve-export.mjs",
    url: "http://127.0.0.1:4173/firstsong/",
    reuseExistingServer: false,
  },
});
