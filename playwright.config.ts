import { defineConfig, devices } from "@playwright/test";
import { VIEWPORT } from "./tests/fixtures/constants";

const PORT = 5174;
const CI = Boolean(process.env.CI);
/** Set by scripts/playwright-docker.sh: the browser runs in the Playwright image, the runner on the host. */
const WS_ENDPOINT = process.env.PW_WS_ENDPOINT;

/**
 * Visual regression: final states of pages with the backend mocked (tests/api).
 * Baselines come from the browser in the Playwright Docker image (`npm run test:visual`), so they match in CI,
 * which runs inside the same image.
 */
export default defineConfig({
  testDir: "tests/specs",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFileName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],

  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      stylePath: "tests/visual.css",
      // Rendering in the Docker image is deterministic, so no tolerance at all. The default per-pixel
      // color threshold (0.2) let a recolored disabled button and anything under a modal backdrop pass.
      threshold: 0,
      maxDiffPixels: 0,
    },
  },

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    colorScheme: "light",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    // <loopback> lets the dockerized browser open the Vite server on the host's 127.0.0.1.
    connectOptions: WS_ENDPOINT ? { wsEndpoint: WS_ENDPOINT, exposeNetwork: "<loopback>" } : undefined,
  },

  projects: [{ name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: VIEWPORT } }],

  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !CI,
    // Nothing listens on :9 — if a request slips past the mocks, the proxy fails instead of reaching a real API.
    env: { SHOP_API_URL: "http://127.0.0.1:9" },
  },
});
