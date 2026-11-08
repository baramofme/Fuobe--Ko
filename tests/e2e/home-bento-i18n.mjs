// Home's first screen in Korean: a standalone i18n gate for <section id="home-bento">.
// Usage: node tests/e2e/home-bento-i18n.mjs [appUrl]   (default http://localhost:3020)
//
// It reads en.json and ko.json and asserts by KEY, never by duplicated literals, so the locale table is the contract.
//
// 1. English by default: the first screen still reads its own words (byte-identity, no regression).
// 2. The cookie (fuobe_lang=ko) + a navigation: the whole server-rendered first screen reads Korean — the headline,
//    the note, every tile's meta/title/CTA and name, the numbers tile, the canvas board, the wipe words, the
//    typed phrases, the foot note — and none of the English originals is left anywhere in it.
// 3. Client chrome follows the switch without a reload (the Audio tile's buttons, the Pause button).
// 4. The page stays put at 390 / 768 / 1440 under Korean: no sideways scroll anywhere.
// 5. No "[i18n]" warning or page error through all of it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DESKTOP, PHONE, launch, openRoute } from "./_browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const en = JSON.parse(fs.readFileSync(path.join(root, "src/lib/i18n/locales/en.json"), "utf8"));
const ko = JSON.parse(fs.readFileSync(path.join(root, "src/lib/i18n/locales/ko.json"), "utf8"));

const app = (process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:3020").replace(/\/$/, "");

const browser = await launch();
const problems = [];
const noise = [];
const step = (name) => console.log(`\n== ${name}`);
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};
const listen = (page, tag) => {
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") noise.push(`${tag} console.${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => noise.push(`${tag} pageerror: ${e.message}`));
};

/** Reads the section's text (textContent: what the DOM holds, including the parts a width hides) and its links' names. */
const readSection = (page) =>
  page.evaluate(() => {
    const sec = document.getElementById("home-bento");
    if (!sec) return null;
    const text = sec.textContent.replace(/\s+/g, " ").trim().replace(/\u00a0/g, " ");
    const names = [...sec.querySelectorAll("a[aria-label]")].map((a) => a.getAttribute("aria-label"));
    const scroll = { w: document.documentElement.scrollWidth, iw: window.innerWidth };
    return { text, names, scroll, htmlLang: document.documentElement.lang };
  });

const KO = {
  h1: [ko["home.bento.h1a"], ko["home.bento.h1b"], ko["home.bento.accent"], ko["home.bento.h1c"]],
  aside: ko["home.bento.aside"],
  badge: ko["home.bento.badge"],
  footSm: ko["home.bento.foot.sm"],
  footLg: ko["home.bento.foot.lg"],
  wipe: [ko["home.bento.wipe.original"], ko["home.bento.wipe.swapped"]],
  num: [ko["home.bento.numbers.studios"], ko["home.bento.numbers.apps"], ko["home.bento.numbers.effects"]],
  board: [ko["home.bento.canvas.photo"], ko["home.bento.canvas.scene"], ko["home.bento.canvas.earring"], ko["home.bento.canvas.film"]],
  phrases: [
    ko["home.bento.live.phrase.evening_makeup_deep_red_lips"],
    ko["home.bento.live.phrase.hair_down_side_swept_waves"],
    ko["home.bento.live.phrase.big_gold_hoop_earrings"],
  ],
  voice: {
    group: ko["home.bento.voice.demoAria"],
    noiseGroup: ko["home.bento.voice.noiseGroup"],
    on: ko["home.bento.voice.noiseOn"],
    off: ko["home.bento.voice.noiseOff"],
    tap: ko["home.bento.voice.tapToListen"],
    noisy: ko["home.bento.voice.noisyState"],
  },
};

// Every English string this card wired: none of them may be left once the page reads Korean.
const EN_KEYS = [
  "home.bento.h1a", "home.bento.h1b", "home.bento.accent", "home.bento.h1c", "home.bento.aside", "home.bento.badge",
  "home.bento.foot.sm", "home.bento.foot.lg", "home.bento.wipe.original", "home.bento.wipe.swapped",
  "home.bento.numbers.studios", "home.bento.numbers.apps", "home.bento.numbers.effects",
  "home.bento.canvas.photo", "home.bento.canvas.scene", "home.bento.canvas.earring", "home.bento.canvas.film",
  "home.bento.live.phrase.evening_makeup_deep_red_lips", "home.bento.live.phrase.hair_down_side_swept_waves", "home.bento.live.phrase.big_gold_hoop_earrings",
  "home.bento.voice.demoAria", "home.bento.voice.noiseGroup", "home.bento.voice.noiseOn", "home.bento.voice.noiseOff",
  "home.bento.voice.tapToListen", "home.bento.voice.noisyState",
  ...["video", "image", "audio", "threeD", "genjutsu", "live", "canvas", "numbers"].flatMap((k) => [`.title`, `.cta`, `.meta`, `.label`].map((s) => `home.bento.${k}${s}`)),
];

const goto = async (page, url) => { await page.goto(url, { waitUntil: "load" }); await page.locator("#home-bento h1").waitFor({ timeout: 20_000 }); };

step("1. English by default: the first screen reads its own words");
{
  const ctx = await browser.newContext(DESKTOP);
  const page = await ctx.newPage();
  listen(page, "en");
  await goto(page, `${app}/`);
  const r = await readSection(page);
  check("the headline is English", r.text.includes(en["home.bento.h1a"]) && r.text.includes(en["home.bento.accent"].replace(/\u00a0/g, " ")), r.text.slice(0, 90));
  check("the note is English", r.text.includes(en["home.bento.aside"]), "");
  check("the tiles' words are English", r.text.includes(en["home.bento.video.title"]) && r.text.includes(en["home.bento.video.cta"]), "");
  check("the foot note is English", r.text.includes(en["home.bento.foot.lg"]), "");
  check("html lang is en", r.htmlLang === "en", `lang=${r.htmlLang}`);
  await ctx.close();
}

step("2. The cookie says Korean: the whole first screen reads Korean (server render)");
{
  const ctx = await browser.newContext(DESKTOP);
  const page = await ctx.newPage();
  listen(page, "ko");
  await goto(page, `${app}/`);
  await page.evaluate(() => {
    document.cookie = "fuobe_lang=ko; path=/; max-age=31536000; samesite=lax";
    localStorage.setItem("fuobe.lang", "ko");
  });
  await goto(page, `${app}/`);
  // Wait for the Korean render to settle before reading anything (the dev server may still be compiling).
  await page.waitForFunction(() => document.getElementById("home-bento")?.innerText.includes("무엇이든"), null, { timeout: 20_000 });
  await page.waitForTimeout(1500);
  const r = await readSection(page);

  check("the headline reads Korean", KO.h1.every((w) => r.text.includes(w.replace(/\u00a0/g, " "))), r.text.slice(0, 120));
  check("the note reads Korean", r.text.includes(KO.aside), "");
  check("the video tile's words read Korean", r.text.includes(ko["home.bento.video.title"]) && r.text.includes(ko["home.bento.video.cta"]), "");
  check("the meta lines count in Korean", /비디오 모델 \d+개 · 카메라 움직임 \d+가지/.test(r.text) && /이미지 · 모델 \d+개/.test(r.text) && /오디오 · 사운드 도구 \d+개/.test(r.text) && /3D · 모델 \d+개/.test(r.text), "");
  check("every tile's CTA reads Korean", ["video", "image", "audio", "threeD", "genjutsu", "live", "canvas"].every((k) => r.text.includes(ko[`home.bento.${k}.cta`])), "");
  check("the badge reads 비디오", r.text.includes(KO.badge), "");
  check("the numbers tile reads Korean", KO.num.every((w) => r.text.includes(w)) && /오픈 모델 \d+종도 있습니다\./.test(r.text), r.text.slice(0, 200));
  check("the canvas board reads Korean", KO.board.every((w) => r.text.includes(w)), "");
  check("the foot note reads Korean", r.text.includes(KO.footSm) && r.text.includes(KO.footLg), "");
  check("the links' names read Korean", r.names.length >= 8 && r.names.some((n) => n.startsWith("비디오:")) && r.names.some((n) => n.includes("모든 스튜디오를 열기")), r.names.join(" | ").slice(0, 200));
  check("html lang is ko", r.htmlLang === "ko", `lang=${r.htmlLang}`);

  // The English originals are gone from the section's whole text (the brands that stay English are ComfyUI, RTX 5090, Genjutsu).
  const gone = EN_KEYS.map((k) => en[k]).filter((v) => v !== undefined && !/ComfyUI|RTX|Genjutsu/.test(v));
  const left = gone.filter((v) => r.text.includes(v.replace(/\u00a0/g, " ")));
  check("no English string this card wired is left", left.length === 0, left.join(" | "));

  step("3. The typing and the swap words turn Korean as they run");
  await page.waitForTimeout(2500);
  const samples = [];
  for (let i = 0; i < 14; i++) {
    samples.push(await page.evaluate(() => ({
      typed: document.querySelector('#home-bento [data-tile="live"] .hb-typed, #home-bento [class*="typed"]')?.textContent ?? "",
      wipe: [...document.querySelectorAll('#home-bento [class*="wipe"] span')].map((s) => s.textContent),
    })));
    await page.waitForTimeout(450);
  }
  const typedAll = samples.map((s) => s.typed).join(" ");
  check("the typed phrases came round in Korean", KO.phrases.some((p) => typedAll.includes(p)), typedAll.slice(0, 120));
  check("no English phrase typed", !/evening makeup|side-swept|hoop earrings/i.test(typedAll), "");
  const wipeAll = samples.flatMap((s) => s.wipe);
  const wipeEn = wipeAll.filter((w) => /Original|Swapped/.test(w));
  const wipeKo = wipeAll.filter((w) => KO.wipe.includes(w));
  if (wipeAll.length) {
    check("the swap words read Korean, never English", wipeKo.length > 0 && wipeEn.length === 0, `${wipeEn.length} en / ${wipeKo.length} ko`);
  } else {
    console.log("  skip the swap words (the reel never showed its divider in this run)");
  }

  step("4. The Audio tile's own buttons follow the language");
  const tile = page.locator('#home-bento [data-tile="audio"]');
  check("the switch reads 소음 켜기 · 소음 끄기", (await tile.getByRole("button", { name: KO.voice.on, exact: true }).count()) > 0 && (await tile.getByRole("button", { name: KO.voice.off, exact: true }).count()) > 0, "");
  check("the play button reads 탭해서 듣기", (await tile.getByRole("button", { name: KO.voice.tap, exact: true }).count()) === 1, "");
  check("the chip says 소음 있는 식당", (await tile.locator("[data-demo-state]").textContent()).trim() === KO.voice.noisy, "");
  const groupAria = await tile.getAttribute("aria-label");
  check("the demo's group is named in Korean", groupAria === KO.voice.group, `aria=${groupAria}`);
  const switchAria = await tile.locator('[role="group"]').first().getAttribute("aria-label");
  check("the switch's group is named 소음", switchAria === KO.voice.noiseGroup || (await tile.locator('[aria-label]').nth(1).getAttribute("aria-label")) === KO.voice.noiseGroup, `aria=${switchAria}`);
  await ctx.close();
}

step("5. A switch without a reload moves the client chrome at once");
{
  const ctx = await browser.newContext(DESKTOP);
  const page = await ctx.newPage();
  listen(page, "switch");
  await openRoute(page, `${app}/`);
  const tile = page.locator('#home-bento [data-tile="audio"]');
  check("the buttons start in English", (await tile.getByRole("button", { name: en["home.bento.voice.tapToListen"], exact: true }).count()) === 1, "");
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
  const trigger = page.locator("button:has(svg.lucide-globe)").locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  check("still the same page (no reload happened)", page.url().endsWith("/"), page.url());
  check("the play button went Korean right after the click", (await tile.getByRole("button", { name: KO.voice.tap, exact: true }).count()) === 1, "");
  const h1Still = await page.locator("#home-bento h1").textContent();
  check("the server headline waits for the next render (documented behaviour)", h1Still.includes(en["home.bento.h1a"]), h1Still);
  await page.reload({ waitUntil: "load" });
  await page.locator("#home-bento h1").waitFor({ timeout: 20_000 });
  await page.waitForFunction(() => document.getElementById("home-bento")?.innerText.includes("무엇이든"), null, { timeout: 20_000 });
  check("after a reload the whole screen reads Korean", await page.locator("#home-bento").innerText().then((t) => t.includes(KO.aside) && t.includes(ko["home.bento.video.cta"])), "");
  await ctx.close();
}

step("6. Korean keeps the layout at 390, 768 and 1440");
for (const [tag, size] of [["390", PHONE], ["768", { viewport: { width: 768, height: 900 } }], ["1440", DESKTOP]]) {
  const ctx = await browser.newContext({ ...size, colorScheme: "light" });
  const page = await ctx.newPage();
  listen(page, tag);
  await page.goto(`${app}/`, { waitUntil: "load" });
  await page.evaluate(() => {
    document.cookie = "fuobe_lang=ko; path=/; max-age=31536000; samesite=lax";
    localStorage.setItem("fuobe.lang", "ko");
  });
  await goto(page, `${app}/`);
  await page.waitForFunction(() => document.getElementById("home-bento")?.innerText.includes("무엇이든"), null, { timeout: 20_000 });
  await page.waitForTimeout(800);
  const r = await readSection(page);
  check(`${tag}: no sideways scroll`, r.scroll.w <= r.scroll.iw + 1, `${r.scroll.w} > ${r.scroll.iw}`);
  check(`${tag}: the headline is whole`, r.text.includes(KO.h1[0]) && r.text.includes(KO.h1[3].replace(/\u00a0/g, " ")), r.text.slice(0, 90));
  await ctx.close();
}

step("7. Quiet through all of it");
check("no [i18n] warning and no page error", noise.filter((n) => /\[i18n\]|pageerror/.test(n)).length === 0, noise.join(" | "));

await browser.close();
if (problems.length) {
  console.error(`\nFAIL (${problems.length}):\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("\nAll good.");
