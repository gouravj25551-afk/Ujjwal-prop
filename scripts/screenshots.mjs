// Full-page screenshots for review: `npm run screenshots` (server must be running: `npm start`)
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.env.BASE_URL || "http://localhost:4173";
const out = process.env.OUT_DIR || "docs/screenshots";
const pages = (process.env.PAGES || "index,buy,sell,rent,invest").split(",");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const [name, opts] of [
  ["desktop", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }],
  ["mobile", { ...devices["iPhone 13"], deviceScaleFactor: 2 }],
]) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  for (const p of pages) {
    await page.goto(`${base}/${p}.html`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // Load lazy images before a full-page capture.
    await page.evaluate(async () => {
      for (const img of document.querySelectorAll("img")) img.loading = "eager";
      await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
    });
    await page.screenshot({ path: `${out}/${p}-${name}.jpg`, fullPage: true, quality: 80, type: "jpeg" });
    console.log(`${out}/${p}-${name}.jpg`);
  }
  await context.close();
}
await browser.close();
