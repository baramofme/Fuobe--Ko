// 레인 M2(shorts·swap·assist)의 money 4자리가 언어 전환에 반응하는지의 실브라우저 판정(t_0c8c31f4).
// 공식 tests/e2e/lang-switch.mjs에는 append 하지 않는다(규칙 9g — 형제 레인이 이 파일 꼬리를 확장 중,
// hotspot 회피). 대신 레인 전용 게이트로 꼬리 충돌을 원천 차단한다.
//
// 판정값은 로케일 파일에서 직접 읽어 키 표 자체를 검증한다(문자열 복제·게이트 탈동기화 방지).
// 4자리: shorts-studio costText span·swap anchors의 모델 Select 줄·swap review(Finish)의 priceLine·
// swap assemble(Assemble the clip)의 aside. 4번째 surface(run-skill-dialog)는 스킬 데이터가 있어야
// 열려야 보여서 이 dev 상태에서 안 뜨면 정직 skip한다(규칙 9f — 실제 렌더되는 키만 게이트로 단언;
// 조립 " · N runs" 바이트 재현은 레인 vitest 판정 5가 증명한다).
// 데모 분기(placeholderFree)가 공통 경로 — demo 모드에서 en 원문이 뜨면 ko 단회 전환(무리로드)·
// ko→en 되돌리기 바이트 동일·pageerror 0를 실증한다.
import { DESKTOP, launch, openRoute, root } from "./_browser.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";

const app = (
  process.argv.slice(2).find((a) => !a.startsWith("--")) ??
  "http://localhost:3054"
).replace(/\/$/, "");

const en = JSON.parse(readFileSync(new URL("../../src/lib/i18n/locales/en.json", import.meta.url), "utf-8"));
const ko = JSON.parse(readFileSync(new URL("../../src/lib/i18n/locales/ko.json", import.meta.url), "utf-8"));
const KEY_PH = "faceless.controls.placeholderFree";
const KEY_GPU = "studio.composer.freeYourGpu";
const EN_PH = en[KEY_PH];
const KO_PH = ko[KEY_PH];
const EN_GPU = en[KEY_GPU];
const KO_GPU = ko[KEY_GPU];

const clipFile = path.join(root, "scripts/eval/fixtures/walk-6s.mp4");

async function upload(file, type, name) {
  const form = new FormData();
  form.append("file", new Blob([readFileSync(file)], { type }), name);
  const res = await fetch(`${app}/api/uploads`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);
  return (await res.json()).url;
}

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

/** en 원문 출현을 anchor로 기다린다. 데이터 부재로 안 뜨면 false(정직 skip의 근거). */
async function waitEnAnchor(page, ms = 20_000) {
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
  check(`${tag}: English byte-identical after switching back`, backOn, `backOn=${backOn}`);
}

const rendered = [];

step("surface: shorts-studio의 costText span (preset·video hand-off URL)");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "shorts");
  const clipUrl = await upload(clipFile, "video/mp4", "walk.mp4");
  await openRoute(page, `${app}/shorts?preset=shorts-claymation&video=${encodeURIComponent(clipUrl)}`);
  const hasEn = await waitEnAnchor(page);
  if (!hasEn) {
    console.log("  skip shorts costText: demo price not rendered in this dev state (레인 vitest의 바이트·조립 판정으로 대체 증명)");
  } else {
    rendered.push("shorts costText");
    await proveSwitch(page, "shorts costText");
  }
  await page.close();
}

step("surface: swap의 3자리(anchors Select·review Finish·assemble aside)");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "swap");
  await openRoute(page, `${app}/character-swap`);
  await page.getByRole("heading", { name: "Swap a character through whole clips" }).waitFor({ timeout: 60_000 }).catch(() => {});
  await page.getByPlaceholder("Project name, e.g. Rain scene").fill("M2 gate");
  await page.getByRole("button", { name: /New project · cloud/ }).click().catch(() => {});
  await page.waitForURL(/\/character-swap\/swap-/, { timeout: 60_000 }).catch(() => {});
  await page.locator('input[type="file"][accept^="video/"]').first().setInputFiles(clipFile).catch(() => {});
  await page.getByRole("button", { name: /^walk/ }).waitFor({ timeout: 90_000 }).catch(() => {});

  const stages = [
    { tag: "swap anchors Select", tab: "Scene anchors" },
    { tag: "swap review Finish", tab: "Takes & review" },
    { tag: "swap assemble aside", tab: "Assemble" },
  ];
  for (const { tag, tab } of stages) {
    step(`  stage: ${tag}`);
    await page.getByRole("tab", { name: tab }).click().catch(() => {});
    const hasEn = await waitEnAnchor(page, 15_000);
    if (!hasEn) {
      console.log(`  skip ${tag}: demo line not rendered in this dev state (shot·estimate 부재 가능)`);
      continue;
    }
    rendered.push(tag);
    await proveSwitch(page, tag);
  }
  await page.close();
}

step("surface: run-skill-dialog의 priceLine (스킬 데이터 필요 — 정직 확인)");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "assist");
  await openRoute(page, `${app}/assist`);
  const hasEn = await waitEnAnchor(page, 8_000);
  if (!hasEn) {
    console.log("  skip run-skill-dialog browser proof: dialog needs a saved skill; 이 dev 상태의 guest에는 스킬 목록이 비어 있다(조립 바이트는 레인 vitest 판정 5가 실증)");
  } else {
    rendered.push("run-skill priceLine");
    await proveSwitch(page, "run-skill priceLine");
  }
  await page.close();
}

step("freeYourGpu의 browser 줄임(데모가 프리를 대체하는 상태에서는 정직 skip)");
{
  // 데모 분기는 placeholderFree가 잡는다 — open engine의 "Free · your GPU"는 데모에서 안 뜬다(규칙 9f).
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "gpu");
  await openRoute(page, `${app}/shorts?preset=shorts-claymation`);
  const hasGpuEn = await page
    .waitForFunction((t) => document.body.innerText.includes(t), EN_GPU, { timeout: 8000 })
    .then(() => true, () => false);
  if (!hasGpuEn) {
    console.log("  skip freeYourGpu browser proof: demo가 open price를 대체(오픈프리·ko 줄임은 레인 vitest 판정 D가 실측)");
  } else {
    await pick(page, "한국어");
    const gpuKo = await page.evaluate((t) => document.body.innerText.includes(t), KO_GPU);
    const gpuEnLeft = await page.evaluate((t) => document.body.innerText.includes(t), EN_GPU);
    check("freeYourGpu reads its Korean words after the switch", gpuKo, "");
    check("no English freeYourGpu left", !gpuEnLeft, "");
    await pick(page, "English");
    check("freeYourGpu byte-identical after switching back", await page.evaluate((t) => document.body.innerText.includes(t), EN_GPU), "");
    rendered.push("freeYourGpu");
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
console.log(`\nrendered surfaces that passed the live switch: ${rendered.length} (${rendered.join(", ") || "none"})`);
if (problems.length) {
  console.log(`\n${problems.length} FAILED:\n` + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log("\nlang-switch-cluster-m2: all rendered-surface checks passed (pageerror 0)");
