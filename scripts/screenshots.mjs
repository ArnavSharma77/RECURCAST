import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "screenshots");

const BASE = "http://127.0.0.1:3001";
const PAGES = [
  { path: "/", name: "01-landing" },
  { path: "/login", name: "02-login" },
  { path: "/dashboard", name: "03-dashboard" },
  { path: "/whatif", name: "04-whatif" },
  { path: "/actuals", name: "05-actuals" },
  { path: "/intake", name: "06-intake" },
  { path: "/pricing", name: "07-pricing" },
  { path: "/premium", name: "08-premium" },
];

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  await context.addCookies([
    { name: "rc_client", value: "demo-client-id", domain: "127.0.0.1", path: "/" },
    { name: "rc_user", value: "demo", domain: "127.0.0.1", path: "/" },
  ]);

  for (const pg of PAGES) {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}${pg.path}`, { waitUntil: "networkidle", timeout: 15000 });
    } catch {
      await page.goto(`${BASE}${pg.path}`, { waitUntil: "load", timeout: 10000 });
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, `${pg.name}.png`), fullPage: true });
    console.log(`OK ${pg.name}`);
    await page.close();
  }

  await browser.close();
  console.log("Done!");
}

run().catch(e => { console.error(e); process.exit(1); });
