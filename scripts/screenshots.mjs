// README screenshots: the homepage "Try it" editor in light and dark mode.
// Needs a built site (`npm run build:site`). Writes docs/images/editor-*.png.
import { chromium } from "@playwright/test";
import { preview } from "vite";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const shots = [
  { file: "editor-light.png", scheme: "light", subject: "Maths" },
  { file: "editor-dark.png", scheme: "dark", subject: "Chemistry" },
];

const server = await preview({ configFile: resolve(root, "site/vite.config.ts"), preview: { port: 0, host: "127.0.0.1" } });
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error("preview server did not start");
const browser = await chromium.launch();
try {
  for (const { file, scheme, subject } of shots) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme });
    await page.goto(url);
    await page.getByRole("button", { name: subject, exact: true }).click();
    await page.locator("#hero-input .mi-field").click();
    await page.evaluate("document.fonts.ready");
    await page.locator(".try").screenshot({ path: resolve(root, "docs/images", file), animations: "disabled" });
    await page.close();
    console.log(`wrote docs/images/${file}`);
  }
} finally {
  await browser.close();
  await new Promise((done) => server.httpServer.close(done));
}
