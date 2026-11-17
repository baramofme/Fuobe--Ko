// Probe: what /settings actually renders (lane t_0bea23fe gate design).
import { DESKTOP, launch, openRoute } from "./_browser.mjs";
const app = (process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:3031").replace(/\/$/, "");
const browser = await launch();
const page = await browser.newPage({ ...DESKTOP });
await openRoute(page, `${app}/settings#get-started`);
const lang = await page.evaluate(() => document.documentElement.lang);
console.log("html lang:", lang);
console.log("stored lang:", await page.evaluate(() => localStorage.getItem("fuobe.lang")));
const heads = await page.evaluate(() => [...document.querySelectorAll("main h1, main h2, main h3")].map((h) => `${h.tagName}: ${h.textContent.trim()}`));
console.log("headings:\n" + heads.join("\n"));
const full = await page.evaluate(() => document.querySelector("main")?.innerText.slice(0, 3000));
console.log("main innerText (first 3000):\n" + full);
const details = await page.evaluate(() => document.querySelectorAll("details").length);
console.log("details count:", details);
const probes = ["Tell me when a job is done", "Send a test", "API tokens", "Sign everyone out", "Public sign-up", "Add a connector", "LoRA folder", "Providers for Assist", "Get started", "What do you want to do?"];
for (const p of probes) {
  const n = await page.getByText(p, { exact: true }).count();
  const vis = await page.getByText(p, { exact: true }).locator("visible=true").count().catch(() => "err");
  console.log(`probe "${p}": total=${n} visible=${vis}`);
}
await browser.close();
