const { chromium } = require("playwright");
const path = require("path");

async function shot(page, url, name) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  const out = path.join(__dirname, "..", "screenshots", name);
  await page.screenshot({ path: out, fullPage: false });
  console.log("saved", out);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const base = "http://127.0.0.1:3002";
  await shot(page, base + "/", "landing-desktop.png");
  await shot(page, base + "/login", "login-desktop.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, base + "/", "landing-mobile.png");
  await browser.close();
})();
