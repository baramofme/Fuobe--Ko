// 레인 M1 전용 언어 전환 게이트 — 공식 tests/e2e/lang-switch.mjs에는 손대지 않는다
// (형제 레인이 그 꼬리를 동시에 확장할 수 있어 별도 파일로 꼬리 충돌을 원천 차단한다).
// Usage: node tests/e2e/lang-switch-cluster-m1.mjs [appUrl]   (앱은 켜져 있어야 한다, 데모 모드 무관)
//
// 오디오 클러스터의 price 줄 4자리(audio-tools RunBar·clean-voice·clean-dialogue의 cloud price·
// katana)를 en→ko 단회 전환과 되돌리기로 실측한다. remove-dialogue는 trio 리터럴이 없어 이 레인이
// useI18n 구독 한 줄만 넣었으므로, 그 openToolPrice 줄이 전환을 거쳐도 깨지지 않고 같은 바이트로
// 돌아오는지를 확인한다(열기 브랜치의 단어는 레인 L 소유).
//
// 판정값은 en.json·ko.json에서 키로 읽는다 — 표를 고쳐도 게이트가 같이 어긋나지 않는다(규칙 9g).
// 이 레인이 배선한 키는 2종: faceless.controls.placeholderFree·studio.composer.freeYourGpu.
// "Price unknown"·"Under $0.01"·"under $0.01"·"Free · runs on your GPU"는 카드가 범위 밖으로
// 실측한 변형이므로 ko에서 그대로 남아 있어야 한다(남으면 무접촉이 사실이라는 증거).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DESKTOP, launch, openRoute, root } from "./_browser.mjs";

const app = (
  process.argv.slice(2).find((a) => !a.startsWith("--")) ??
  "http://localhost:3000"
).replace(/\/$/, "");

const enAll = JSON.parse(fs.readFileSync(path.join(root, "src/lib/i18n/locales/en.json"), "utf8"));
const koAll = JSON.parse(fs.readFileSync(path.join(root, "src/lib/i18n/locales/ko.json"), "utf8"));
const KEY_PLACEHOLDER = "faceless.controls.placeholderFree";
const KEY_FREE = "studio.composer.freeYourGpu";
const EN_PLACEHOLDER = enAll[KEY_PLACEHOLDER];
const KO_PLACEHOLDER = koAll[KEY_PLACEHOLDER];
const EN_FREE = enAll[KEY_FREE];
const KO_FREE = koAll[KEY_FREE];

/** 배선된 en 값 → 그 키의 ko 값. */
const WIRED = { [EN_PLACEHOLDER]: KO_PLACEHOLDER, [EN_FREE]: KO_FREE };
/** 카드가 범위 밖으로 실측한 변형(이 레인은 건드리지 않았다) — ko에서 그대로 남아야 한다. */
const OUT_OF_SCOPE = new Set(["Price unknown", "Under $0.01", "under $0.01", "Free · runs on your GPU"]);
/** 배선된 키 값이든 범위 밖 가격 값이든, "가격이 정해졌다"는 신호만 판정에 쓴다.
    "Pricing…"/"Checking…"는 데이터가 아직 안 온 상태이므로 판정에서 제외한다(진공 통과 방지). */
const looksLikePrice = (t) => Object.prototype.hasOwnProperty.call(WIRED, t) || OUT_OF_SCOPE.has(t) || t.startsWith("≈ $");

const problems = [];
const step = (name) => console.log(`\n- ${name}`);
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};

// 데모/실가격 어느 쪽으로 결정돼도 키 표로 판정할 수 있게, 세 표면을 채울 픽스처를 만든다.
const out = fs.mkdtempSync("/tmp/fuobe-cluster-m1-");
const wav = path.join(out, "m1-source.wav");
const webm = path.join(out, "m1-reference.webm");
const png = path.join(out, "m1-photo.png");
const ff = (args, what) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg failed (${what}): ${r.stderr}`);
};
ff(["-f", "lavfi", "-i", "aevalsrc=0.2*sin(2*PI*330*t)|0.2*sin(2*PI*440*t):s=44100:d=6", wav], "wav");
//remove-dialogue는 silent 검사가 걸려 음성이 있어야 가격 줄이 뜬다("This clip has no sound" 가드 회피).
ff(["-f", "lavfi", "-i", "testsrc=size=320x180:rate=25:duration=3", "-f", "lavfi", "-i", "aevalsrc=0.2*sin(2*PI*330*t):s=44100:d=3", "-map", "0:v", "-map", "1:a", "-c:v", "libvpx", "-c:a", "libvorbis", "-crf", "8", webm], "webm");
ff(["-f", "lavfi", "-i", "color=c=0x3366cc:size=512x512:duration=1", "-frames:v", "1", png], "png");

const browser = await launch();

// 헤더의 언어 선택기(공식 게이트와 같은 트릭): 열려 있는 메뉴/다이얼로그를 먼저 치운다.
async function openSelector(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
  const trigger = page.locator("button:has(svg.lucide-globe)").locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem").first().waitFor({ timeout: 8_000 });
  return page;
}
async function pick(page, name) {
  const menu = await openSelector(page);
  await menu.getByRole("menuitem", { name }).click();
  await page.waitForTimeout(400);
  const lang = await page.evaluate(() => document.documentElement.lang);
  check(`<html lang="${name === "한국어" ? "ko" : "en"}"> on the same render`, lang === (name === "한국어" ? "ko" : "en"), `lang=${lang}`);
  check("the same page, no reload", true, page.url());
}

/** price 줄의 단색 스팬들을 키 표로 읽는다(run 행의 조립은 그대로 두고 가격 값만 판정한다). */
const priceTexts = (row) =>
  row.evaluate((el) => [...el.querySelectorAll("span.font-mono.text-foreground")].map((s) => s.textContent.trim()).filter(Boolean));

/** en에서 price 줄 값이 잡힐 때까지 기다린다(규칙 9e: 데이터가 올 때까지는 가드 문구가 먼저 뜬다). */
async function waitPrice(row, ms = 60_000) {
  const deadline = Date.now() + ms;
  for (;;) {
    const t = await priceTexts(row);
    if (t.some(looksLikePrice)) return t;
    if (Date.now() > deadline) return t;
    await new Promise((r) => setTimeout(r, 500));
  }
}

/** en→ko 단회 전환과 되돌리기 — 배선된 값은 ko로, 범위 밖 값은 그대로. */
async function priceSwitch(page, label, row) {
  await row.waitFor({ state: "visible", timeout: 60_000 });
  const texts0 = await waitPrice(row);
  const en = texts0.find(looksLikePrice) ?? null;
  if (!en) {
    check(`${label}: a price line rendered at all`, false, `texts=${JSON.stringify(texts0)} row=${JSON.stringify((await row.locator("p").first().innerText().catch(() => "?")))}`);
    return;
  }
  const wired = Object.prototype.hasOwnProperty.call(WIRED, en);
  check(`${label}: priced in English, byte-exact (${en})`, true, "");
  await pick(page, "한국어");
  const texts1 = await priceTexts(row);
  if (wired) {
    check(`${label}: the price line reads its Korean words (${WIRED[en]})`, texts1.includes(WIRED[en]), JSON.stringify(texts1));
    check(`${label}: no English price value left`, !texts1.includes(en), JSON.stringify(texts1));
    check(`${label}: the Korean words carry Hangul and no hanja`, /[가-힯]/.test(WIRED[en]) && !/[\u4e00-\u9fff]/.test(WIRED[en]), WIRED[en]);
  } else {
    check(`${label}: the out-of-scope value is untouched in Korean (${en})`, texts1.includes(en), JSON.stringify(texts1));
  }
  await pick(page, "English");
  const texts2 = await priceTexts(row);
  check(`${label}: the English bytes come back identical`, texts2.includes(en), `was=${en} now=${JSON.stringify(texts2)}`);
}

// 콘솔 소음: 전환 사이에 페이지가 무엇을 말하는지. "[i18n]" 경고는 우리가 놓친 키다.
const noise = [];
function listen(page, tag) {
  page.on("console", (m) => (m.type() === "warning" || m.type() === "error") && noise.push(`${tag} console.${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => noise.push(`${tag} pageerror: ${e.message}`));
}

const rowWith = (page, button) =>
  page.locator("div.flex.flex-wrap.items-center.gap-3").filter({ has: page.getByRole("button", { name: button, exact: true }) }).first();

step("audio loop: the run bar's price line switches in one render");
{
  const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "light" });
  await ctx.addInitScript(() => localStorage.setItem("fuobe.engine", "open"));
  const page = await ctx.newPage();
  listen(page, "loop");
  await openRoute(page, `${app}/audio/loop`);
  await page.locator('input[type="file"][accept^="audio/"]').first().setInputFiles(wav);
  await priceSwitch(page, "audio loop", rowWith(page, "Loop it"));
  await ctx.close();
}

step("clean up voice: the demo recording's price line switches in one render");
{
  const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "light" });
  await ctx.addInitScript(() => localStorage.setItem("fuobe.engine", "open"));
  const page = await ctx.newPage();
  listen(page, "clean-voice");
  await openRoute(page, `${app}/audio/clean`);
  await page.getByRole("button", { name: "Try it on this recording", exact: true }).first().waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: "Try it on this recording", exact: true }).first().click();
  await priceSwitch(page, "clean up voice", rowWith(page, "Clean up voice"));
  await ctx.close();
}

step("clean dialogue: the cloud cleaner's price line switches in one render");
{
  const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "light" });
  await ctx.addInitScript(() => localStorage.setItem("fuobe.engine", "cloud"));
  const page = await ctx.newPage();
  listen(page, "clean-dialogue");
  await openRoute(page, `${app}/audio/split?preset=clean-dialogue`);
  await page.locator('input[type="file"][accept^="audio/"]').first().setInputFiles(wav);
  await priceSwitch(page, "clean dialogue (cloud)", rowWith(page, "Clean it"));
  await ctx.close();
}

step("katana: the segment line's price switches in one render");
{
  const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "light" });
  await ctx.addInitScript(() => localStorage.setItem("fuobe.engine", "open"));
  const page = await ctx.newPage();
  listen(page, "katana");
  await openRoute(page, `${app}/katana`);
  await page.locator('input[type="file"][accept*="video/"]').first().setInputFiles(webm);
  // 사진 한 장이 있어야 preview가 잡힌다(카드: 조립 pool?.text ?? money 유지).
  await page.locator('input[type="file"][accept*="image/"]').first().setInputFiles(png);
  const row = page.locator("div.flex.items-center.gap-3").filter({ has: page.getByRole("button", { name: "Recreate", exact: true }) }).first();
  await priceSwitch(page, "katana", row);
  await ctx.close();
}

step("remove dialogue: the open-tool price line re-renders across the switch");
{
  // 이 레인은 이 표면에 trio 리터럴이 없어 구독 한 줄만 넣었다(카드 실측). openToolPrice의
  // 단어는 레인 L 소유 — 여기서는 줄이 전환을 거쳐도 깨지지 않고 같은 바이트로 돌아옴을 확인한다.
  // 레인 L가 병합으로 단어를 배선하면 그 줄은 ko로 바뀌므로, "영어 그대로"와 "한글로 바뀜"을
  // 둘 다 통과시키되 줄이 사라지거나 깨지는 실패만 잡아낸다.
  const OPEN_WORDS = new Set(["Free", EN_PLACEHOLDER, "Not available here"]);
  const waitOpen = async (row, ms = 60_000) => {
    const deadline = Date.now() + ms;
    for (;;) {
      const t = await priceTexts(row);
      if (t.some((x) => OPEN_WORDS.has(x))) return t;
      if (Date.now() > deadline) return t;
      await new Promise((r) => setTimeout(r, 500));
    }
  };
  const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "light" });
  await ctx.addInitScript(() => localStorage.setItem("fuobe.engine", "open"));
  const page = await ctx.newPage();
  listen(page, "remove-dialogue");
  await openRoute(page, `${app}/video-tools/remove-dialogue`);
  await page.locator('input[type="file"][accept*="video/"]').first().setInputFiles(webm);
  const row = rowWith(page, "Remove dialogue");
  await row.waitFor({ state: "visible", timeout: 60_000 });
  const texts0 = await waitOpen(row);
  const en = texts0.find((t) => OPEN_WORDS.has(t)) ?? null;
  if (!en) {
    check("remove dialogue: the open-tool price line rendered", false, `texts=${JSON.stringify(texts0)} line=${JSON.stringify(await row.locator("p").first().innerText().catch(() => "?"))}`);
  } else {
    check(`remove dialogue: priced in English (${en})`, true, "");
    await pick(page, "한국어");
    const texts1 = await priceTexts(row);
    check("remove dialogue: the line is still there in Korean (its words are lane L's)", texts1.includes(en) || texts1.some((t) => /[가-힯]/.test(t)), JSON.stringify(texts1));
    await pick(page, "English");
    const texts2 = await priceTexts(row);
    check("remove dialogue: the line returns byte-identical", texts2.includes(en), `was=${en} now=${JSON.stringify(texts2)}`);
  }
  await ctx.close();
}

step("nothing was missed on the way");
{
  const i18nNoise = noise.filter((l) => /\[i18n\]/.test(l));
  check("no missing-key warning", i18nNoise.length === 0, i18nNoise.join(" | "));
  const pageErrors = noise.filter((l) => /pageerror/.test(l));
  check("no page error during the switches", pageErrors.length === 0, pageErrors.join(" | "));
}

await browser.close();
fs.rmSync(out, { recursive: true, force: true });
if (problems.length) {
  console.log(`\n${problems.length} FAILED:\n` + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log("\nlang-switch-cluster-m1: all checks passed");
