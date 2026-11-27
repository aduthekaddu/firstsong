import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig(base, {
  testIgnore: [],
  testMatch: "**/*.webkit.spec.ts",
  use: { browserName: "webkit", launchOptions: {} },
});
