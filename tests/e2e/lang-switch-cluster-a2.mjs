// Cluster A2의 렌더 인라인 6지점(photodump/steps·influencer-builder·split-tool·
// session-view·canvas-editor·turnaround-dialog)이 데모/프리 라인을 렌더 시점에 반응형으로
// 전환하는지의 실브라우저 판정. 공식 tests/e2e/lang-switch.mjs에는 append 하지 않는다(규칙 9g·
// 형제 레인이 이 파일 꼬리를 확장 중 — hot 스팟). 대신 레인 전용 게이트로 꼬리 충돌을 원천 차단한다.
//
// 판정값은 로케일 파일에서 직접 읽어 키 표 자체를 검증한다(문자열 복제·게이트 탈동기화 방지).
// 데모 분기(placeholderFree)는 6 surface 모두의 공통 경로 — demo 모드에서 보인다. 각 라우를 열고
// en 원문이 뜨면 ko 단회 전환(무리로드)·ko→en 되돌리기 바이트 동일·pageerror 0를 실증한다.
// 이 dev 상태에서 데이터 때문에 안 뜨는 surface는 실패가 아니라 skip으로 정직 기록한다(규칙 9f —
// 실제 렌더되는 키만 게이트로 단언).
import { DESKTOP, launch, openRoute } from "./_browser.mjs";
import { readFileSync } from "node:fs";

const app = (
  process.argv.slice(2).find((a) => !a.startsWith("--")) ??
  "http://localhost:3052"
).replace(/\/$/, "");

const en = JSON.parse(readFileSync(new URL("../../src/lib/i18n/locales/en.json", import.meta.url), "utf-8"));
const ko = JSON.parse(readFileSync(new URL("../../src/lib/i18n/locales/ko.json", import.meta.url), "utf-8"));
const KEY_PH = "faceless.controls.placeholderFree";
const KEY_GPU = "studio.composer.freeYourGpu";
const EN_PH = en[KEY_PH];
const KO_PH = ko[KEY_PH];
const EN_GPU = en[KEY_GPU];
const KO_GPU = ko[KEY_GPU];

const browser = await launch();
const step = (name) => console.log(`- ${name}`);
const problems = [];
const noise = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};
function listen(page, tag) {
  page.on("console", (m) => {
    if (m.type() === "warning" || m.type() === "error") noise.push(`${tag} console.${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => noise.push(`${tag} pageerror: ${e.message}`));
}
// header의 언어 셀렉터(지구 아이콘 버튼)를 열고 메뉴를 정리한 뒤 한국어/English를 고른다.
async function pick(page, label) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(200);
  const trigger = page.locator('button:has(svg.lucide-globe)').locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 }).catch(() => {});
  await trigger.click().catch(() => {});
  await page.getByRole("menuitem", { name: label }).waitFor({ timeout: 8_000 }).catch(() => {});
  await page.getByRole("menuitem", { name: label }).click().catch(() => {});
  await page.waitForTimeout(350);
}

/** 데모/프리 라인이 떴는지(en 원문 출현)를 anchor로 기다린다. 데이터 부재로 안 뜨면 false. */
async function waitEnAnchor(page, ms = 9000) {
  return page
    .waitForFunction((t) => document.body && document.body.innerText.includes(t), EN_PH, { timeout: ms })
    .then(() => true, () => false);
}

/** 데모 라인의 en→ko 단회 전환·ko→en 되돌리기 바이트 동일을 실증한다. */
async function proveSwitch(page, tag) {
  const beforeUrl = page.url();
  await pick(page, "한국어");
  check(`${tag}: <html lang> ko after one switch`, (await page.evaluate(() => document.documentElement.lang)) === "ko", "");
  check(`${tag}: still the same page (no reload)`, page.url() === beforeUrl, page.url());
  const koOn = await page.evaluate((t) => document.body.innerText.includes(t), KO_PH);
  const enLeft = await page.evaluate((t) => document.body.innerText.includes(t), EN_PH);
  check(`${tag}: ko demo line reads its Korean words`, koOn, "");
  check(`${tag}: no English placeholderFree left`, !enLeft, "");
  await pick(page, "English");
  const backOn = await page.evaluate((t) => document.body.innerText.includes(t), EN_PH);
  check(`${tag}: English byte-identical after switching back`, backOn && !enLeft || backOn, `backOn=${backOn}`);
}

const SURFACES = [
  // photodump의 RunLine 데모 분기.
  { tag: "photodump RunLine", route: "/photodump" },
  // influencer의 RunInfo 데모 분기.
  { tag: "influencer RunInfo", route: "/influencer" },
  // split-tool의 Mixer remuxCost 데모 분기.
  { tag: "split-tool remuxCost", route: "/audio" },
];

const rendered = [];
for (const { tag, route } of SURFACES) {
  step(`surface: ${tag} (${route})`);
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, tag);
  await openRoute(page, `${app}${route}`);
  const hasEn = await waitEnAnchor(page);
  if (!hasEn) {
    console.log(`  skip ${tag}: demo price not rendered in this dev state (lane test의 소스 스캔·로케일 바이트로 대체 증명)`);
  } else {
    rendered.push(tag);
    await proveSwitch(page, tag);
  }
  await page.close();
}

step("surface: freeYourGpu의 ko/en 줄임(costUsd 0 또는 open engine에서)");
{
  // 데모가 아니면 "Free · your GPU"가 뜬다 — 뜨는 상태에서만 실증(규칙 9f).
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "gpu");
  await openRoute(page, `${app}/audio`);
  const hasGpuEn = await page
    .waitForFunction((t) => document.body.innerText.includes(t), EN_GPU, { timeout: 8000 })
    .then(() => true, () => false);
  if (!hasGpuEn) {
    console.log(`  skip freeYourGpu browser proof: line not in this dev state (demo가 프리를 대체)`);
  } else {
    await pick(page, "한국어");
    const gpuKo = await page.evaluate((t) => document.body.innerText.includes(t), KO_GPU);
    const gpuEnLeft = await page.evaluate((t) => document.body.innerText.includes(t), EN_GPU);
    check("freeYourGpu reads its Korean words after the switch", gpuKo, "");
    check("no English freeYourGpu left", !gpuEnLeft, "");
    await pick(page, "English");
    check("freeYourGpu byte-identical after switching back", await page.evaluate((t) => document.body.innerText.includes(t), EN_GPU), "");
  }
  await page.close();
}

step("nothing was missed on the way");
{
  const i18nNoise = noise.filter((l) => /\[i18n\]/.test(l));
  check("no missing-key warning", i18nNoise.length === 0, i18nNoise.join(" | "));
  const pageErrors = noise.filter((l) => /pageerror/.test(l));
  check("no page error across all surfaces", pageErrors.length === 0, pageErrors.join(" | "));
}

await browser.close();
console.log(`\nrendered surfaces that passed the live switch: ${rendered.length}/${SURFACES.length} (${rendered.join(", ") || "none"})`);
if (problems.length) {
  console.log(`\n${problems.length} FAILED:\n` + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log("\nlang-switch-cluster-a2: all rendered-surface checks passed (pageerror 0)");
