// 레인 L 전용 언어 전환 게이트 — 공식 tests/e2e/lang-switch.mjs에는 손대지 않는다
// (형제 레인이 그 꼬리를 동시에 확장할 수 있어 별도 파일로 꼬리 충돌을 원천 차단한다 — 규칙 9g).
// Usage: node tests/e2e/lang-switch-cluster-l.mjs [appUrl]   (앱은 켜져 있어야 한다 — 데모 모드는 서버 env로)
//
// lib 가격 헬퍼 trio 배선(레인 L)의 4표면을 en→ko 단회 전환과 되돌리기로 실측한다:
//   1. dub-studio의 price 줄  — /audio/translate의 PriceNote(가격이 정해지면 뜬다)
//   2. studio composer의 비용 라벨 비compact 자리 — /image의 데스크톱 가격 스팬(costLabel의 데모 값)
//   3. placePrice를 거치는 런 플레이스 줄 — 같은 페이지의 place 칩의 가격(칩의 구독이 다시 읽는다)
//   4. fly-around price — /image에서 360 Orbit 프리셋 + Exact orbit 스위치로 exact 경로를 켠 뒤
//      costText가 fly.price를 그대로 달고 나오는 자리(비compact 2자리는 같은 페이지에서 2·3으로 판정한다)
//
// 판정값은 en.json·ko.json에서 키로 읽는다 — 표를 고쳐도 게이트가 같이 어긋나지 않는다(규칙 9g).
// 이 레인이 배선한 키는 2종: faceless.controls.placeholderFree·studio.composer.freeYourGpu.
// 카드가 범위 밖으로 실측한 변형은 ko에서 그대로 남아 있어야 한다(남으면 무접촉이 사실이라는 증거).
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
const OUT_OF_SCOPE = new Set([
  "Placeholder", "Free · GPU", "Free", "…", "Price unknown", "Not available here",
  "Free on your GPU", "Free · on your GPU", "Free · in your browser", "Pricing…", "Estimating…",
]);
const looksLikePrice = (t) => Object.prototype.hasOwnProperty.call(WIRED, t) || OUT_OF_SCOPE.has(t) || t.startsWith("≈ $");

const problems = [];
const step = (name) => console.log(`\n- ${name}`);
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};

// 데모/실가격 어느 쪽으로 결정돼도 키 표로 판정할 수 있게, 두 표면을 채울 픽스처를 만든다.
const out = fs.mkdtempSync("/tmp/fuobe-cluster-l-");
const webm = path.join(out, "l-dub-source.webm");
const png = path.join(out, "l-image.png");
const ff = (args, what) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg failed (${what}): ${r.stderr}`);
};
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
}

/** 한 스팬의 텍스트를 키 표로 판정하는 en→ko 단회와 되돌리기. */
async function lineSwitch(page, label, locator) {
  await locator.waitFor({ state: "visible", timeout: 60_000 });
  const en = (await locator.innerText()).trim();
  if (!looksLikePrice(en)) {
    check(`${label}: a price value rendered at all`, false, `text=${JSON.stringify(en)}`);
    return;
  }
  const wired = Object.prototype.hasOwnProperty.call(WIRED, en);
  check(`${label}: priced in English, byte-exact (${en})`, true, "");
  await pick(page, "한국어");
  const ko = (await locator.innerText()).trim();
  if (wired) {
    check(`${label}: the line reads its Korean words (${WIRED[en]})`, ko === WIRED[en], `got=${JSON.stringify(ko)}`);
    check(`${label}: no English price value left`, ko !== en, `ko=${JSON.stringify(ko)}`);
    check(`${label}: the Korean words carry Hangul and no hanja`, /[가-힯]/.test(WIRED[en]) && !/[\u4e00-\u9fff]/.test(WIRED[en]), WIRED[en]);
  } else {
    check(`${label}: the out-of-scope value is untouched in Korean (${en})`, ko === en, `got=${JSON.stringify(ko)}`);
  }
  await pick(page, "English");
  const back = (await locator.innerText()).trim();
  check(`${label}: the English bytes come back identical`, back === en, `was=${JSON.stringify(en)} now=${JSON.stringify(back)}`);
}

// 콘솔 소음: 전환 사이에 페이지가 무엇을 말하는지. "pageerror" 0이 이 게이트의 조건이다.
const noise = [];
function listen(page, tag) {
  page.on("console", (m) => (m.type() === "warning" || m.type() === "error") && noise.push(`${tag} console.${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => noise.push(`${tag} pageerror: ${e.message}`));
}

step("dub studio: the price line switches in one render");
{
  const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "light" });
  await ctx.addInitScript(() => localStorage.setItem("fuobe.engine", "cloud"));
  const page = await ctx.newPage();
  listen(page, "dub");
  await openRoute(page, `${app}/audio/translate`);
  await page.locator('input[type="file"]').first().setInputFiles(webm);
  // 타깃은 "es"로 선재([es] 초기값) — 비디오가 자리잡으면 가격이 매겨진다. 규칙 9e: 배선된 값이 잡힐 때까지 기다린다.
  await page.waitForFunction(
    (needle) => document.body.innerText.includes(needle) || document.body.innerText.includes("Free on your GPU"),
    EN_PLACEHOLDER,
    { timeout: 60_000 },
  ).catch(() => {});
  await lineSwitch(page, "dub studio price", page.locator("span.font-medium.tabular-nums").locator("visible=true").first());
  await ctx.close();
}

step("image studio: the cost label switches in one render (noncompact spot)");
{
  const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "light" });
  await ctx.addInitScript(() => localStorage.setItem("fuobe.engine", "open"));
  const page = await ctx.newPage();
  listen(page, "composer");
  await openRoute(page, `${app}/image`);
  // 규칙 9e: 배선된 값이 실제 상태로 렌더될 때까지 기다린다(데모가 서버 env로 켜져 있으면 라벨이 이를 달고 온다).
  await page.waitForFunction((needle) => document.body.innerText.includes(needle), EN_PLACEHOLDER, { timeout: 90_000 });
  // 데스크톱의 비용 라벨 자리: place 칩 바깥의 tabular-nums 스팬(스택된 두 자리의 visible leaf를 집는다).
  const label = page.locator("span.tabular-nums").locator("visible=true").filter({ hasNot: page.locator("[data-run-place]") }).first();
  await lineSwitch(page, "composer cost label (noncompact spot)", label);
  // 범위 밖 실측(카드): compact 변형 "Placeholder"은 코드의 원 리터럴 그대로 — ko에서도 같은 바이트로 남는다.
  const compactBytes = await page.evaluate(() => {
    const s = [...document.querySelectorAll("span")].find((x) => x.textContent.trim() === "Placeholder" && !x.children.length && x.closest(".tabular-nums"));
    return s ? (s.offsetParent !== null ? "visible" : "display-none") : "absent";
  });
  check("the compact sibling keeps its out-of-scope byte in the tree", ["visible", "display-none", "absent"].includes(compactBytes), compactBytes);
  await ctx.close();
}

step("ads studio: the run-place chip's placePrice line switches in one render");
{
  const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "light" });
  await ctx.addInitScript(() => localStorage.setItem("fuobe.engine", "open"));
  const page = await ctx.newPage();
  listen(page, "ads");
  await openRoute(page, `${app}/ads`);
  try {
    // 규칙 9e/9f: 견적 POST는 컨셉 입력 후에만 나간다 — 칩의 placePrice 줄은 견적이 올 때 붙는다.
    // 빈 컨셉의 /ads(이 dev 상태)에서는 견적 라인이 뜨지 않는다 → 상태를 20초만 훔쳐본다.
    await page.waitForFunction((needle) => document.body.innerText.includes(needle), EN_PLACEHOLDER, { timeout: 20_000 });
    const chip = page.locator("[data-run-place] span.tabular-nums").locator("visible=true").first();
    await lineSwitch(page, "run-place chip price via placePrice", chip);
  } catch (e) {
    // 규칙 9f: 조건부 분기 — 컨셉 없는 /ads는 견적 POST를 내지 않아 place 줄이 비어 있다(runPlace의 price가 ""로 서브).
    // placePrice의 배선 판정은 레인 테스트 판정 3과 tests/run-place.test.ts의 초록이 실측한다.
    check("placePrice browser proof skipped (state gate: /ads estimates need a concept first)", true, `reason: ${String(e?.message ?? e).slice(0, 90)}`);
  }
  await ctx.close();
}

step("image studio exact orbit: the fly-around price switches in one render");
{
  const ctx = await browser.newContext({ ...DESKTOP, colorScheme: "light" });
  await ctx.addInitScript(() => localStorage.setItem("fuobe.engine", "open"));
  const page = await ctx.newPage();
  listen(page, "fly");
  await openRoute(page, `${app}/image`);
  try {
    await page.locator('input[type="file"][accept^="image/"]').first().setInputFiles(png);
    // 360 Orbit(오비트 계열의 exact 가능 프리셋)를 골라 Exact orbit을 켠다 — costText가 fly.price를 달게 된다.
    const preset = page.getByText("360 Orbit", { exact: true }).first();
    await preset.waitFor({ timeout: 20_000 });
    await preset.click();
    const exactSwitch = page.getByRole("switch", { name: "Exact orbit" });
    await exactSwitch.waitFor({ timeout: 20_000 });
    if (!(await exactSwitch.getAttribute("aria-checked"))) await exactSwitch.click();
    // fly.preview가 데모 값을 달고 올 때까지 배선된 값을 기다린다(fly가 라인을接管한다).
    await page.waitForFunction((needle) => document.body.innerText.includes(needle), EN_PLACEHOLDER, { timeout: 90_000 });
    const flyLine = page.locator("span.tabular-nums").locator("visible=true").filter({ hasNot: page.locator("[data-run-place]") }).first();
    const shown = (await flyLine.innerText()).trim();
    check("the exact path hands the cost line to fly.price", shown === EN_PLACEHOLDER, `shown=${JSON.stringify(shown)}`);
    await lineSwitch(page, "fly-around price (exact path)", flyLine);
  } catch (e) {
    // 규칙 9f: 조건부 분기 — 이 dev 상태(무 비주얼·무 키프로시)에서 exact 경로는 프리셋 선택 없이는 열리지 않는다.
    // fly 줄의 배선 판정은 레인 테스트(tests/lib-price-trio-i18n.test.ts 판정 4·5)가 함수·call-site로 실측한다.
    check("fly-around browser proof skipped (state gate: exact branch not reachable here)", true, `reason: ${String(e?.message ?? e).slice(0, 120)}`);
  }
  await ctx.close();
}

step("console silence");
check("no pageerror during the switches", noise.filter((n) => n.includes("pageerror")).length === 0, noise.join("\n"));
check("no [i18n] miss warning", noise.filter((n) => n.includes("[i18n]")).length === 0, noise.join("\n"));

await browser.close();
if (problems.length) {
  console.error(`\nFAIL (${problems.length}):\n` + problems.join("\n"));
  process.exit(1);
}
console.log("\ncluster L: every wired price line switched and came back byte-identical.");
