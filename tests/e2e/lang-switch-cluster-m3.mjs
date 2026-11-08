// Lane M3's own browser gate: the canvas node footer, the Layers panel's two price spots and Genjutsu's Quality hint.
// Usage: node tests/e2e/lang-switch-cluster-m3.mjs [appUrl]   (the app in demo mode: FUOBE_DEMO_MODE=on)
//
// Each wired surface: English first (wait for the wired anchor), 한국어 in one render with no reload, then English
// back — the price strings must return byte-for-byte, and no page error may show up. Assertion values resolve from
// the locale files by KEY (so a table edit cannot desync this gate). The lang-switch.mjs tail stays untouched —
// this file is the lane's separate gate (the shared tail would collide with sibling lanes).
import fs from "node:fs";
import path from "node:path";
import { DESKTOP, PHONE, launch, openRoute, root } from "./_browser.mjs";

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
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const trioRe = new RegExp(`^(${TRIO_EN.map(esc).join("|")})$`);

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
const upload = async (file, type) => {
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(file)], { type }), path.basename(file));
  const res = await fetch(`${app}/api/uploads`, { method: "POST", body: form });
  const body = await res.json();
  if (!res.ok) throw new Error(`upload: ${body.error}`);
  return body.url;
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

/** Reads the price line whichever language it is currently in: the element holding the EN or the KO value wins. */
const priceReader = (page, scope, enVal, koVal) => async () => {
  for (const val of [koVal, enVal]) {
    const el = scope.getByText(val, { exact: true }).first();
    if (await el.isVisible().catch(() => false)) return (await el.innerText()).trim();
  }
  return "";
};

// ---- Setup (demo mode): the app must run in demo mode so every price reads "Placeholder · free".
const status = await json("/api/status");
if (status.demoMode !== "on") {
  console.log("the app must run in demo mode (FUOBE_DEMO_MODE=on) — nothing to gate");
  await browser.close();
  process.exit(1);
}

/** en → ko → en on one render: Korean shows, no English trio bytes remain in the line, and the line returns byte-for-byte. */
async function switchRoundTrip(page, tag, anchor, readLine, enVal, koVal) {
  await anchor.waitFor({ state: "visible", timeout: 30_000 });
  const before = (await readLine()).trim();
  check(`${tag}: the English bytes show first`, before.includes(enVal), before);
  await switchLang(page, "한국어");
  check(`${tag}: <html lang="ko">`, (await page.evaluate(() => document.documentElement.lang)) === "ko", "");
  const koNow = (await readLine().catch(() => "")).trim();
  check(`${tag}: the Korean words show`, koNow.includes(koVal), koNow);
  check(`${tag}: no English trio bytes left in the line`, !TRIO_EN.some((t) => koNow.includes(t)), koNow);
  await switchLang(page, "English");
  check(`${tag}: <html lang="en"> again`, (await page.evaluate(() => document.documentElement.lang)) === "en", "");
  const back = (await readLine().catch(() => "")).trim();
  check(`${tag}: the line is byte-identical after switching back`, back === before, `before=${before} after=${back}`);
}

step("canvas board: the node footer's price switches and returns byte-for-byte");
{
  const graph = {
    nodes: [
      { id: "p0", type: "prompt", position: { x: 0, y: 0 }, data: { text: "A fox in snow" } },
      { id: "i0", type: "model", position: { x: 380, y: 0 }, data: { modelId: "nano-banana-pro", mediaKind: "image" } },
    ],
    edges: [{ id: "e1", source: "p0", sourceHandle: "out", target: "i0", targetHandle: "prompt" }],
  };
  const c = await json("/api/canvases", { method: "POST", body: JSON.stringify({ name: "M3 price switch", graph }) });
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "board");
  await openRoute(page, `${app}/canvas/${c.id}`);
  const node = page.locator('[data-testid="canvas-node-i0"]');
  await node.waitFor({ timeout: 120_000 });
  // The footer line is structural (its text changes with the language): the truncate span of the border-t footer row.
  const foot = node.locator("div.border-t > span.truncate").first();
  await foot.waitFor({ state: "visible", timeout: 30_000 });
  await switchRoundTrip(page, "board", foot, () => foot.innerText(), en(KEYS.placeholderFree), ko(KEYS.placeholderFree));
  await page.close();

  step("canvas NodeList (phone): the card's assembled ` · ` price line switches");
  // One context for both tabs: same-origin storage is shared, so the store's storage listener can reach the canvas tab.
  const listCtx = await browser.newContext({ ...PHONE });
  const phone = await listCtx.newPage();
  listen(phone, "list");
  await openRoute(phone, `${app}/canvas/${c.id}`);
  await phone.getByRole("tab", { name: "Nodes" }).click();
  const card = phone.locator('[data-testid="canvas-card-i0"]');
  await card.waitFor({ timeout: 60_000 });
  const koValL = ko(KEYS.placeholderFree);
  const enValL = en(KEYS.placeholderFree);
  const listAnchor = card.locator("p").filter({ hasText: `· ${enValL}` }).first();
  // Korean first when it is here, English otherwise — so a half-updated tab can't masquerade as the new language.
  const readList = async () => {
    const ps = await card.locator("p").evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()));
    return ps.find((t) => t.includes(koValL)) ?? ps.find((t) => t.includes(enValL)) ?? "";
  };
  await listAnchor.waitFor({ state: "visible", timeout: 30_000 });
  const beforeL = await readList();
  check("Nodelist: the English bytes show first", beforeL.includes(enValL), beforeL);
  // The canvas tab's phone bar carries no globe of its own: switch from a second phone tab on the home bar.
  // The store's storage listener re-renders THIS tab on the same tick — no reload happens here.
  const homeTab = await listCtx.newPage();
  listen(homeTab, "home");
  await openRoute(homeTab, app);
  await switchLang(homeTab, "한국어");
  check("Nodelist: <html lang=\"ko\"> reached the canvas tab too", (await phone.evaluate(() => document.documentElement.lang)) === "ko", "");
  const koNowL = await readList().catch(() => "");
  check("Nodelist: the Korean words show without a reload", koNowL.includes(koValL), koNowL);
  check("Nodelist: no English trio bytes left in the line", !TRIO_EN.some((t) => koNowL.includes(t)), koNowL);
  await switchLang(homeTab, "English");
  await phone.waitForTimeout(400);
  const backL = await readList().catch(() => "");
  check("Nodelist: the line is byte-identical after switching back", backL === beforeL, `before=${beforeL} after=${backL}`);
  check("Nodelist: the canvas tab never navigated", phone.url().includes(`/canvas/${c.id}`), phone.url());
  await phone.close();
  await homeTab.close();
  await listCtx.close();
}

step("layers: the selected layer's price and the Add layer dialog's price switch together");
{
  const image = await upload(path.join(root, "scripts/eval/fixtures/character/drawn-face-2.png"), "image/png");
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "layers");
  await openRoute(page, `${app}/layers?image=${encodeURIComponent(image)}`);
  await page.waitForURL(/\/layers\/[\w-]+/, { timeout: 60_000 });
  const row = page.locator('button[aria-label^="Select layer"]').first();
  await row.waitFor({ timeout: 60_000 });
  await row.click().catch(() => {});
  const enVal = en(KEYS.placeholderFree);
  const koVal = ko(KEYS.placeholderFree);
  const selAnchor = page.getByText(enVal, { exact: true }).first();
  const readSel = priceReader(page, page, enVal, koVal);
  await selAnchor.waitFor({ state: "visible", timeout: 30_000 });
  const before = await selAnchor.innerText();
  check("layers: the selected layer's price reads the English bytes first", before.trim() === enVal, before);
  await switchLang(page, "한국어");
  check("layers: <html lang=\"ko\">", (await page.evaluate(() => document.documentElement.lang)) === "ko", "");
  const koNow = await readSel();
  check("layers: the selected layer's price reads Korean", koNow === koVal, koNow);
  check("layers: no English trio bytes left on the panel", (await page.getByText(trioRe).count()) === 0, "");
  // "Add layer" opens a menu; its "Generate layer" item opens the dialog — the same wired fn through AddLayer's own hook.
  const openGenDialog = async (val) => {
    await page.getByRole("button", { name: "Add layer" }).first().click();
    await page.getByRole("menuitem", { name: "Generate layer" }).click();
    const dialog = page.getByRole("dialog").filter({ hasText: val }).first();
    await dialog.waitFor({ timeout: 20_000 });
    return dialog;
  };
  await page.getByRole("button", { name: "Add layer" }).first().click();
  await page.getByRole("menuitem", { name: "Generate layer" }).click();
  const dialogK = page.getByRole("dialog").filter({ hasText: koVal }).first();
  await dialogK.waitFor({ timeout: 20_000 });
  check("layers: the Add layer dialog's price reads Korean too", await dialogK.getByText(koVal, { exact: true }).first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await switchLang(page, "English");
  const back = await readSel();
  check("layers: the selected layer's English bytes are back byte-for-byte", back === before, `before=${before} after=${back}`);
  const dialogE = await openGenDialog(enVal);
  check("layers: the dialog's English bytes are back too", await dialogE.getByText(enVal, { exact: true }).first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.close();
}

step("genjutsu character: the Quality hint (openFree 래퍼 유지 · 안의 tr화) switches on one render");
{
  const was = (await json("/api/settings")).settings.find((s) => s.name === "engineMode").value;
  await json("/api/settings", { method: "PUT", body: JSON.stringify({ engineMode: "open" }) });
  const clipUrl = await upload(path.join(root, "public/samples/demo-landscape.mp4"), "video/mp4");
  const heroUrl = await upload(path.join(root, "scripts/eval/fixtures/character/drawn-face-2.png"), "image/png");
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "genjutsu");
  await openRoute(page, `${app}/genjutsu?mode=character&video=${encodeURIComponent(clipUrl)}&image=${encodeURIComponent(heroUrl)}`, { settleMs: 1500 });
  const q = page.getByRole("radiogroup", { name: "Quality" });
  await q.waitFor({ timeout: 60_000 });
  // 2K/4K는 finish 사이즈: 그 선택에서만 qualityShort가 trio("Free · your GPU")를 반환한다(480p/768p는 H3 자체 사이즈).
  const pick = q.getByRole("radio", { name: "4K" }).or(q.getByRole("radio", { name: "2K" }));
  await pick.first().click();
  const enVal = en(KEYS.freeYourGpu);
  const koVal = ko(KEYS.freeYourGpu);
  const hintAnchor = page.getByText(enVal, { exact: true }).first();
  await switchRoundTrip(page, "genjutsu", hintAnchor, priceReader(page, page, enVal, koVal), enVal, koVal);
  await page.close();
  // The open engine was only borrowed for this hint — put the install's choice back.
  await json("/api/settings", { method: "PUT", body: JSON.stringify({ engineMode: was }) });
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
console.log("\nlang-switch-cluster-m3: all checks passed");
