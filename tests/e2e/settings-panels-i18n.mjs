// Owner settings SUB-PANELS i18n gate (lane t_0bea23fe). The app must be running; the dev instance is its own owner.
// Usage: node tests/e2e/settings-panels-i18n.mjs [appUrl]   (defaults to http://localhost:3024). Exits 1 on any failure.
//
// Proves the sub-panels SettingsForm mounts (notifications, auto patterns, LLM providers, LoRAs, security, assist
// connectors, the setup guide) and the Workers screen render their English bytes first and switch to Korean in ONE
// render (no reload), leaking no English of the wired strings. The intent chips check on Home (Settings renders the
// guide with intents={false}). Values come from the locale files themselves, so this gate checks the key table.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DESKTOP, launch, openRoute } from "./_browser.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const en = JSON.parse(readFileSync(root + "src/lib/i18n/locales/en.json", "utf8"));
const ko = JSON.parse(readFileSync(root + "src/lib/i18n/locales/ko.json", "utf8"));

const app = (process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:3024").replace(/\/$/, "");
const browser = await launch();
const problems = [];
const noise = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};
const listen = (page, tag) => {
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") noise.push(`${tag} console.${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => noise.push(`${tag} pageerror: ${e.message}`));
};

const visibleEl = (scope, value, kind) =>
  kind === "button"
    ? scope.getByRole("button", { name: value, exact: true }).locator("visible=true").first()
    : kind === "placeholder"
      ? scope.locator(`input[placeholder=${JSON.stringify(value)}]`).first()
      : scope.getByText(value, { exact: true }).locator("visible=true").first();

/** Wait until the panel's own content is in the DOM (the form is a skeleton until its data lands). */
async function waitForContent(page, scope, anchorKey) {
  await page
    .waitForFunction(
      ([s, v]) => {
        const el = document.querySelector(s);
        if (!el) return false;
        const t = el.innerText || "";
        return t.includes(v);
      },
      ["main", en[anchorKey]],
      { timeout: 20_000 },
    )
    .catch(() => {});
  const el = visibleEl(scope, en[anchorKey], "text");
  const ok = await el.waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
  check(`the wired content is on screen (${anchorKey})`, ok, `want "${en[anchorKey]}"`);
}

/** Switch to Korean with the header's own selector: one render, no reload. */
async function toKorean(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
  const trigger = page.locator("button:has(svg.lucide-globe)").locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(300);
}

/** One wired key: English bytes first (before the click), Korean after it, its English gone. */
async function checkKey(scope, key, kind = "text") {
  const enText = en[key];
  const koText = ko[key];
  check(`${key}: English bytes first`, await visibleEl(scope, enText, kind).isVisible().catch(() => false), `want "${enText}"`);
  check(`${key}: Korean after the switch`, await visibleEl(scope, koText, kind).isVisible().catch(() => false), `want "${koText}"`);
  check(`${key}: no English left`, (await visibleEl(scope, enText, kind).count()) === 0, "still visible");
}

const PANEL_KEYS = [
  ["settings.panel.notifications.tellMeWhenJobDone", "text"],
  ["settings.panel.notifications.tellMeDesc", "text"],
  ["settings.panel.autoPatterns.promptsGoToKrea", "text"],
  ["settings.panel.autoPatterns.resetToList", "button"],
  ["settings.panel.llm.providersForAssist", "text"],
  ["settings.panel.lora.folderLabel", "text"],
  ["settings.panel.security.noPasswordWarning", "text"],
  ["settings.panel.security.requirePassword", "button"],
  ["settings.panel.security.apiTokens", "text"],
  ["settings.panel.connectors.runWithoutAsking", "text"],
  ["settings.panel.connectors.addAConnector", "button"],
  ["settings.panel.getStarted.title", "text"],
];

console.log("- /settings#get-started (owner): the panels inside SettingsForm");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "settings");
  await openRoute(page, `${app}/settings#get-started`);
  check("the page is /settings", page.url().startsWith(`${app}/settings`), page.url());
  const main = page.locator("main").first();
  await waitForContent(page, main, "settings.panel.lora.folderLabel");
  console.log("  English first");
  for (const [key, kind] of PANEL_KEYS)
    check(`${key}: English bytes first`, await visibleEl(main, en[key], kind).isVisible().catch(() => false), `want "${en[key]}"`);
  console.log("  한국어 in ONE render");
  await toKorean(page);
  check("still /settings — no reload happened", page.url().startsWith(`${app}/settings`), page.url());
  check("<html lang> is ko right after the click", await page.evaluate(() => document.documentElement.lang) === "ko", "");
  for (const [key, kind] of PANEL_KEYS) {
    check(`${key}: Korean after the switch`, await visibleEl(main, ko[key], kind).isVisible().catch(() => false), `want "${ko[key]}"`);
    check(`${key}: no English left`, (await visibleEl(main, en[key], kind).count()) === 0, "still visible");
  }
  await page.close();
}

console.log("- / (owner, first run): the guide's own lines (Home renders it without the chips, the goals are them)");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "home");
  await openRoute(page, `${app}/`);
  const main = page.locator("main").first();
  await waitForContent(page, main, "settings.panel.getStarted.title");
  const HOME_KEYS = [
    ["settings.panel.getStarted.title", "text"],
    ["settings.panel.getStarted.usePaidModels", "text"],
    ["settings.panel.getStarted.useYourGpu", "text"],
    ["settings.panel.getStarted.getKeyAtFal", "text"],
  ];
  console.log("  English first");
  for (const [key, kind] of HOME_KEYS)
    check(`${key}: English bytes first`, await visibleEl(main, en[key], kind).isVisible().catch(() => false), `want "${en[key]}"`);
  console.log("  한국어 in ONE render");
  await toKorean(page);
  check("still / — no reload happened", page.url().endsWith("/"), page.url());
  for (const [key, kind] of HOME_KEYS) {
    check(`${key}: Korean after the switch`, await visibleEl(main, ko[key], kind).isVisible().catch(() => false), `want "${ko[key]}"`);
    check(`${key}: no English left`, (await visibleEl(main, en[key], kind).count()) === 0, "still visible");
  }
  await page.close();
}

console.log("- /settings/workers (owner): the Workers screen");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "workers");
  await openRoute(page, `${app}/settings/workers`);
  check("the page is /settings/workers", page.url().endsWith("/settings/workers"), page.url());
  const main = page.locator("main").first();
  await waitForContent(page, main, "settings.panel.workers.workerIntro");
  const WORKER_KEYS = [
    ["settings.panel.workers.workerIntro", "text"],
    ["settings.panel.workers.runJobsOnWorkers", "text"],
    ["settings.panel.workers.nameLikePc3060ti", "placeholder"],
    ["settings.panel.workers.addAWorker", "button"],
    ["settings.panel.workers.noWorkersYet", "text"],
  ];
  console.log("  English first");
  for (const [key, kind] of WORKER_KEYS)
    check(`${key}: English bytes first`, await visibleEl(main, en[key], kind).isVisible().catch(() => false), `want "${en[key]}"`);
  console.log("  한국어 in ONE render");
  await toKorean(page);
  check("still /settings/workers — no reload happened", page.url().endsWith("/settings/workers"), page.url());
  check("<html lang> is ko right after the click", await page.evaluate(() => document.documentElement.lang) === "ko", "");
  for (const [key, kind] of WORKER_KEYS) {
    check(`${key}: Korean after the switch`, await visibleEl(main, ko[key], kind).isVisible().catch(() => false), `want "${ko[key]}"`);
    check(`${key}: no English left`, (await visibleEl(main, en[key], kind).count()) === 0, "still visible");
  }
  await page.close();
}

console.log("- nothing was missed (no missing-key warning, no page error)");
{
  const i18nNoise = noise.filter((l) => /\[i18n\]/.test(l));
  check("no missing-key warning", i18nNoise.length === 0, i18nNoise.join(" | "));
  const pageErrors = noise.filter((l) => /pageerror/.test(l));
  check("no page error", pageErrors.length === 0, pageErrors.join(" | "));
}

await browser.close();
if (problems.length) {
  console.log(`\n${problems.length} FAILED:\n` + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log("\nsettings-panels-i18n: all checks passed");
