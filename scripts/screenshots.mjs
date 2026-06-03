import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "screenshots");

const BASE = process.env.SCREENSHOT_BASE || "https://recurcast-web.vercel.app";
const PAGES = [
  { path: "/", name: "01-landing" },
  { path: "/login", name: "02-login" },
  { path: "/dashboard", name: "03-dashboard" },
  { path: "/whatif", name: "04-whatif" },
  { path: "/actuals", name: "05-actuals" },
  { path: "/intake", name: "06-intake" },
  { path: "/pricing", name: "07-pricing" },
  { path: "/premium", name: "08-premium" },
  { path: "/premium/windows", name: "09-premium-windows" },
  { path: "/premium/sani", name: "10-premium-sani" },
  { path: "/premium/refresh", name: "11-premium-refresh" },
  { path: "/premium/scrub", name: "12-premium-scrub" },
  { path: "/premium/oneoffs", name: "13-premium-oneoffs" },
];

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const domain = new URL(BASE).hostname;
  await context.addCookies([
    { name: "rc_client", value: "demo-client-id", domain, path: "/" },
    { name: "rc_user", value: "demo", domain, path: "/" },
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
