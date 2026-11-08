// Lane A1's own browser gate: Cinema's five trio price sites and Faceless's episode change price line.
// Usage: node tests/e2e/lang-switch-cinema-a1.mjs [appUrl]   (the app in demo mode: FUOBE_DEMO_MODE=on)
//
// Each wired surface: English first (wait for the wired anchor), 한국어 in one render with no reload,
// then English back — the price strings must return byte-for-byte, and no page error may show up.
// Assertion values resolve from the locale files by KEY (so a table edit cannot desync this gate).
// The lang-switch.mjs tail stays untouched — this file is the lane's separate gate.
import fs from "node:fs";
import path from "node:path";
import { DESKTOP, launch, openRoute, root } from "./_browser.mjs";

const app = (process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:3000").replace(/\/$/, "");

const KEYS = {
  placeholderFree: "faceless.controls.placeholderFree",
  freeYourGpu: "studio.composer.freeYourGpu",
};
const EN = JSON.parse(fs.readFileSync(path.join(root, "src/lib/i18n/locales/en.json"), "utf-8"));
const KO = JSON.parse(fs.readFileSync(path.join(root, "src/lib/i18n/locales/ko.json"), "utf-8"));
const en = (k) => EN[k];
const ko = (k) => KO[k];
const TRIO_EN = Object.values(KEYS).map((k) => en(k));

const browser = await launch();
const step = (name) => console.log(`- ${name}`);
const problems = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const noise = [];
function listen(page, tag) {
  page.on("console", (m) => {
    if (m.type() === "warning" || m.type() === "error") noise.push(`${tag} console.${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => noise.push(`${tag} pageerror: ${e.message}`));
}
const json = async (p, init) => {
  const res = await fetch(app + p, { headers: { "Content-Type": "application/json" }, ...init });
  const body = await res.json();
  if (!res.ok) throw new Error(`${p}: ${body.error ?? res.status}`);
  return body;
};
const until = async (what, fn, ms = 300_000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn().catch(() => null);
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out: ${what}`);
    await sleep(2000);
  }
};

// The header's selector: the only visible globe button, whichever bar this viewport shows.
async function switchLang(page, name) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
  const trigger = page.locator("button:has(svg.lucide-globe)").locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem", { name }).click();
  await page.waitForTimeout(400);
}

// ---- Data (demo mode): one Cinema project with a still, and a rendered Faceless episode.
const status = await json("/api/status");
if (status.demoMode === "off") {
  console.log("the app must run in demo mode (FUOBE_DEMO_MODE=on) — nothing to gate");
  await browser.close();
  process.exit(1);
}
const project = await json("/api/cinema/projects", { method: "POST", body: JSON.stringify({ name: "A1 price switch" }) });
const cinemaSettings = { camera: "modern", lens: "clean-sharp", focal: "24mm" };
const made = await json(`/api/cinema/projects/${project.id}/generate`, {
  method: "POST",
  body: JSON.stringify({ input: { engine: "cloud", mode: "image", action: "generate", prompt: "A lighthouse on a cliff at dusk", settings: cinemaSettings, aspectRatio: "16:9" } }),
});
await until("the still", async () => (await json(`/api/cinema/projects/${project.id}/items`)).items.find((g) => g.id === made.items[0].id && g.status === "succeeded"), 180_000);

const channel = await json("/api/faceless/channels", { method: "POST", body: JSON.stringify({ idea: "Channel about lighthouses and the sea", genre: "history", engine: "open" }) });
const episodeSettings = { engine: "open", length: 60, animation: "frames", aspect: "16:9", subtitles: true, music: false, styleId: "editorial-motion-graphics", styleRefs: [], voice: null, elements: [] };
const ep = await json("/api/faceless/episodes", { method: "POST", body: JSON.stringify({ channelId: channel.id, topic: "The last lighthouse keepers", settings: episodeSettings }) });
await until("the script", async () => (await json(`/api/faceless/episodes/${ep.id}`)).episode.status === "review", 240_000);
await json(`/api/faceless/episodes/${ep.id}/render`, { method: "POST" });
await until("the episode rendered", async () => (await json(`/api/faceless/episodes/${ep.id}`)).episode.status === "done", 300_000);

step("cinema: the composer's price chip switches and returns byte-for-byte");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "composer");
  await openRoute(page, `${app}/cinema/${project.id}`);
  const chip = page.getByText(en(KEYS.placeholderFree), { exact: true }).first();
  await chip.waitFor({ state: "visible", timeout: 30_000 });
  check("the chip reads the English words first", await chip.isVisible().catch(() => false), "");
  await switchLang(page, "한국어");
  check("composer: still the same page (no reload)", !page.url().includes("reload"), page.url());
  check('composer: <html lang="ko">', (await page.evaluate(() => document.documentElement.lang)) === "ko", "");
  check("composer: the Korean words show", await page.getByText(ko(KEYS.placeholderFree), { exact: true }).first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  check("composer: no English trio left", (await page.getByText(new RegExp(`^(${TRIO_EN.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`)).count()) === 0, "");
  await switchLang(page, "English");
  check('composer: <html lang="en"> again', (await page.evaluate(() => document.documentElement.lang)) === "en", "");
  check("composer: the English bytes are back", await page.getByText(en(KEYS.placeholderFree), { exact: true }).first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  await page.close();
}

step("cinema: the scene dialog keeps its assembled bytes through the switch (usePlanPrice via the hook)");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "scene-dialog");
  await openRoute(page, `${app}/cinema/${project.id}`);
  const create = page.getByRole("button", { name: "Create 3D scene" }).first();
  await create.waitFor({ state: "visible", timeout: 60_000 });
  const dialog = page.getByRole("dialog");
  const reOpen = async () => {
    await create.click();
    await dialog.waitFor({ timeout: 20_000 });
  };
  await create.click();
  await dialog.waitFor({ timeout: 20_000 });
  const enButton = dialog.getByRole("button", { name: new RegExp(`^Build 3D scene · ${en(KEYS.placeholderFree)}$`) });
  const koButton = dialog.getByRole("button", { name: new RegExp(`^Build 3D scene · ${ko(KEYS.placeholderFree)}$`) });
  await enButton.first().waitFor({ timeout: 30_000 });
  check("the dialog button keeps the assembled English bytes", true, "");
  await switchLang(page, "한국어");
  await reOpen();
  check("the price part reads Korean while the prefix stays as authored", await koButton.first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  check("no English assembled button name left", (await enButton.count()) === 0, "");
  await switchLang(page, "English");
  await reOpen();
  check("the assembled English bytes are back byte-for-byte", await enButton.first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  await page.keyboard.press("Escape");
  await page.close();
}

step("cinema: the Blockout panel's price switches");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "blockout");
  await openRoute(page, `${app}/cinema/${project.id}`);
  const chip = page.getByRole("button", { name: "Blockout: film a grey-box blockout" }).first();
  await chip.waitFor({ timeout: 30_000 });
  const panel = page.getByRole("dialog", { name: "Blockout to film" });
  await chip.click();
  await panel.waitFor({ timeout: 30_000 });
  await panel.getByText(en(KEYS.placeholderFree), { exact: true }).first().waitFor({ state: "visible", timeout: 20_000 });
  check("the panel's price reads the English words first", true, "");
  await switchLang(page, "한국어");
  await chip.click();
  await panel.waitFor({ timeout: 30_000 });
  check("the price reads Korean after the switch", await panel.getByText(ko(KEYS.placeholderFree), { exact: true }).first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  await switchLang(page, "English");
  await chip.click();
  await panel.waitFor({ timeout: 30_000 });
  check("the price is the English bytes again", await panel.getByText(en(KEYS.placeholderFree), { exact: true }).first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  await page.keyboard.press("Escape");
  await page.close();
}

step("cinema: the World panel's price switches");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "world");
  const openWorld = async () => {
    await openRoute(page, `${app}/cinema/${project.id}?world=1`);
    await page.getByRole("dialog", { name: "World" }).waitFor({ timeout: 60_000 });
  };
  await openWorld();
  const dlg = page.getByRole("dialog", { name: "World" });
  await dlg.getByText(en(KEYS.placeholderFree), { exact: true }).first().waitFor({ state: "visible", timeout: 20_000 });
  check("the World price reads the English words first", true, "");
  await switchLang(page, "한국어");
  await openWorld();
  check("the World price reads Korean", await dlg.getByText(ko(KEYS.placeholderFree), { exact: true }).first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  await switchLang(page, "English");
  await openWorld();
  check("the World price is the English bytes again", await dlg.getByText(en(KEYS.placeholderFree), { exact: true }).first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  await page.close();
}

step("cinema: Soul Cast's price label switches");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "soul");
  await openRoute(page, `${app}/cinema/${project.id}`);
  const cast = page.getByRole("button", { name: "Soul Cast: build a character" }).first();
  if (!(await cast.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /^Director/ }).first().click().catch(() => {});
  }
  await cast.waitFor({ state: "visible", timeout: 20_000 });
  const dialog = page.getByRole("dialog").filter({ hasText: /Build your cast|캐릭터/ }).first();
  await cast.click();
  await dialog.waitFor({ timeout: 30_000 });
  await dialog.getByText(en(KEYS.placeholderFree), { exact: true }).first().waitFor({ state: "visible", timeout: 20_000 });
  check("Soul Cast shows the English price first", true, "");
  await switchLang(page, "한국어");
  await cast.click();
  await dialog.waitFor({ timeout: 30_000 });
  check("the label reads Korean", await dialog.getByText(ko(KEYS.placeholderFree), { exact: true }).first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  await switchLang(page, "English");
  await cast.click();
  await dialog.waitFor({ timeout: 30_000 });
  check("the label is the English bytes again", await dialog.getByText(en(KEYS.placeholderFree), { exact: true }).first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  await page.keyboard.press("Escape");
  await page.close();
}

step("faceless: the episode's change price line switches and returns byte-for-byte");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "episode");
  await openRoute(page, `${app}/faceless/${channel.id}/${ep.id}`, { settleMs: 1500 });
  const tiles = page.getByRole("button", { name: /^Scene \d+, / });
  await tiles.first().waitFor({ timeout: 60_000 });
  // Select the first scene: its tile toggles aria-pressed, and the change editor opens below.
  await tiles.first().click();
  const editor = page.locator('section[aria-label="Change scenes"]').first();
  await editor.waitFor({ timeout: 20_000 });
  const line = editor.locator("p").filter({ hasText: /Re-renders|Pricing…/ }).first();
  await editor.locator("textarea").first().fill("Make it night");
  const enTail = new RegExp(`· ${en(KEYS.placeholderFree)}$`);
  await until("the priced line", async () => enTail.test((await line.innerText().catch(() => ""))), 60_000);
  const enLine = await line.innerText();
  check("the price line assembles with the original spacing", enTail.test(enLine), enLine);
  await switchLang(page, "한국어");
  await page.waitForTimeout(400);
  const koLine = await line.innerText().catch(() => "");
  check("the price part reads Korean on the same render", new RegExp(`· ${ko(KEYS.placeholderFree)}$`).test(koLine), koLine);
  check("no English trio bytes left on the line", !TRIO_EN.some((t) => koLine.includes(t)), koLine);
  await switchLang(page, "English");
  await page.waitForTimeout(400);
  const backLine = await line.innerText().catch(() => "");
  check("the line is byte-identical after switching back", backLine === enLine, `before=${enLine} after=${backLine}`);
  await page.close();
}

step("nothing was missed on the way");
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
console.log("\nlang-switch-cinema-a1: all checks passed");
