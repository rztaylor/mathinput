import { createServer } from "node:net";
import { defineConfig, devices } from "@playwright/test";

/** A free port chosen at start-up, so parallel runs never collide (testing facts). */
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

// Workers re-evaluate this file; they inherit the port the main process chose.
process.env.MI_PLAYWRIGHT_PORT ??= String(Number(process.env.PLAYWRIGHT_PORT) || (await freePort()));
const port = Number(process.env.MI_PLAYWRIGHT_PORT);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  webServer: process.env.PLAYWRIGHT_PORT ? undefined : {
    command: `npx vite --config vite.demo.config.ts --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  // Project names are `<form factor>` (Chromium) or `<form factor>-<engine>`;
  // tests branch on the form factor prefix, never on the engine.
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: false } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "desktop-webkit", use: { ...devices["Desktop Safari"] } },
    { name: "tablet-webkit", use: { ...devices["iPad (gen 7)"] } },
    { name: "phone-webkit", use: { ...devices["iPhone 13"] } },
  ],
});
