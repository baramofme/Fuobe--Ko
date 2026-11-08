// Owner /settings SettingsForm + ConnectField i18n gate (lane t_840a5bbe).
// Usage:
//   node tests/e2e/settings-form-i18n.mjs snapshot <out.json> [appUrl]   — records element rects + console noise
//   node tests/e2e/settings-form-i18n.mjs gate <before.json> [appUrl]    — byte/render/no-residue/noise checks + rect regression ≤1px vs before
// Default app http://localhost:3025. The dev instance is the install's owner (no sign-in set).
import fs from "node:fs";
import { DESKTOP, launch, openRoute } from "./_browser.mjs";

const mode = process.argv[2];
const first = process.argv.slice(3).find((a) => !a.startsWith("--"));
const app = (process.argv.slice(3).find((a, i) => i > 0 && !a.startsWith("--")) ?? "http://localhost:3025").replace(/\/$/, "");

// The elements the rect gate measures: stable ids/roles that exist before and after wiring, in English.
const RECT_OF = [
  ["#engine-title", "h2"],
  ["#cloud-title", "h2"],
  ["#comfyui-title", "h2"],
  ["#loras-title", "h2"],
  ["#training-title", "h2"],
  ["#text-ai-title", "h2"],
  ["#notifications-title", "h2"],
  ["#security-title", "h2"],
  ["#demo-title", "h2"],
  ["#auto-image-title", "h2"],
  ["#models-title", "h2"],
  ["#about-title", "h2"],
  ["#fal input", "input"],
  ["#replicate input", "input"],
  ["#setting-cloud-provider", "trigger"],
  ["#comfyui input", "input"],
  ["#llm-providers", "div"],
  ["#local-llm-label", "p"],
  ["#engine", "section"],
  ["#cloud", "section"],
  ["#text-ai", "section"],
];

const EN = {
  engineTitle: "Engine mode",
  engineDesc: "Choose what this install runs: fully open source, only paid APIs, or both side by side. The mode is enforced on the server, so a locked engine can't be used from the API either.",
  bothTitle: "Open source + paid APIs",
  bothNeeds: "Needs: A fal.ai or Replicate key and/or a ComfyUI server",
  cloudTitle: "Paid API configuration",
  falLabel: "fal.ai API key",
  getKey: "Get a key",
  providerLabel: "Preferred provider",
  comfyTitle: "Open-source engine · ComfyUI",
  lorasTitle: "LoRAs · looks, motions, effects and adapters",
  trainingTitle: "Training · AI-Toolkit",
  textAiTitle: "AI helper · models and providers",
  useLabel: "Use",
  serverLabel: "Local model server",
  foundOnMachine: "Found on this machine",
  checkAgain: "Check again",
  contextLabel: "Context (tokens)",
  sharesGpu: "The local model shares the GPU with ComfyUI. A 4–8B model leaves room for generations.",
  sendTest: "Send a test message",
  demoTitle: "Placeholder results",
  demoSettingName: "Show placeholder results (for a tour)",
  connectorsTitle: "Assist · connectors",
  notificationsTitle: "Notifications",
  securityTitle: "Security",
  autoTitle: "Auto image model",
  modelsTitle: "Models & licences",
  aboutTitle: "About",
  aboutDesc: "The open models, LoRAs and code Fuobe is built on, who made them and their licences, and Fuobe's own source code.",
  engineChip: "Engine",
  setupGuide: "Setup guide",
  saveAndTest: "Save & test",
};

const KO = {
  engineTitle: "엔진 모드",
  bothTitle: "오픈소스 + 유료 API",
  bothNeeds: "요건: fal.ai 또는 Replicate 키, 그리고/또는 ComfyUI 서버",
  cloudTitle: "유료 API 설정",
  falLabel: "fal.ai API 키",
  getKey: "키 발급",
  providerLabel: "선호 제공업체",
  comfyTitle: "오픈소스 엔진 · ComfyUI",
  comfyTail: "에서 각 워크플로가 필요로 하는 모델을 확인하세요.",
  lorasTitle: "LoRA · 룩, 모션, 효과, 어댑터",
  trainingTitle: "학습 · AI-Toolkit",
  textAiTitle: "AI 도우미 · 모델과 제공업체",
  useLabel: "사용",
  serverLabel: "로컬 모델 서버",
  foundOnMachine: "이 컴퓨터에서 찾은 서버",
  checkAgain: "다시 확인",
  contextLabel: "컨텍스트(토큰)",
  demoTitle: "플레이스홀더 결과",
  demoSettingName: "플레이스홀더 결과 표시(투어용)",
  connectorsTitle: "어시스트 · 커넥터",
  notificationsTitle: "알림",
  securityTitle: "보안",
  autoTitle: "자동 이미지 모델",
  modelsTitle: "모델 & 라이선스",
  aboutTitle: "설정 가이드",
  aboutDesc: "Fuobe가 기반하는 오픈 모델, LoRA, 코드와 그 제작자 및 라이선스, 그리고 Fuobe의 자체 소스 코드.",
  engineChip: "엔진",
  setupGuide: "설정 가이드",
  saveAndTest: "저장 및 테스트",
};
// About's title is its own ("About" → "정보" is not our key: settings.about.title is the parent's, in ko 아래?).
delete KO.aboutTitle;

const problems = [];
const noise = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};

const browser = await launch();
const page = await browser.newPage({ ...DESKTOP });
page.on("console", (m) => {
  if (m.type() === "warning" || m.type() === "error") noise.push(`console.${m.type()}: ${m.text()}`);
});
page.on("pageerror", (e) => noise.push(`pageerror: ${e.message}`));
let guideOpen = false;

async function openSettings() {
  await openRoute(page, `${app}/settings`);
  // The form paints after GET /api/settings resolves: wait for a wired section.
  await page.locator("#engine").waitFor({ timeout: 20_000 });
  await page.locator("#loras").waitFor({ timeout: 20_000 });
}

async function rects() {
  return page.evaluate((sels) => {
    const out = {};
    for (const [sel, tag] of sels) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      out[sel] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    }
    return out;
  }, RECT_OF);
}

if (mode === "snapshot") {
  const out = first;
  await openSettings();
  await page.waitForTimeout(300);
  const data = { rects: await rects(), noise };
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(`snapshot → ${out} (${Object.keys(data.rects).length} elements)`);
  await browser.close();
  process.exit(0);
}

// ---- gate -------------------------------------------------------------------
await openSettings();
console.log("- /settings: English first (byte-identical to the pre-wiring render)");
{
  const main = page.locator("main").first();
  const see = async (kind, value) => main.locator(kind === "text" ? `text="${value}"` : kind).first().isVisible().catch(() => false);
  check(`the Engine section title reads "${EN.engineTitle}"`, await main.getByText(EN.engineTitle, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the engine picker's first card reads "${EN.bothTitle}"`, await main.getByText(EN.bothTitle, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the card's needs line reads "${EN.bothNeeds}"`, await main.getByText(EN.bothNeeds, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the Paid API section title reads "${EN.cloudTitle}"`, await main.getByText(EN.cloudTitle, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the fal field is labelled "${EN.falLabel}"`, await main.getByLabel(EN.falLabel, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the key link reads "${EN.getKey}"`, await main.getByRole("link", { name: EN.getKey, exact: true }).first().isVisible().catch(() => false), "");
  check(`the provider select is labelled "${EN.providerLabel}"`, await main.getByLabel(EN.providerLabel, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the ComfyUI section title reads its English bytes`, await main.getByText(EN.comfyTitle, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the LoRAs section title reads its English bytes`, await main.getByText(EN.lorasTitle, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the Training section title reads its English bytes`, await main.getByText(EN.trainingTitle, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the AI helper section title reads its English bytes`, await main.getByText(EN.textAiTitle, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the Use select is labelled "${EN.useLabel}"`, await main.getByLabel(EN.useLabel, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the local model server label reads "${EN.serverLabel}"`, await main.getByText(EN.serverLabel, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the list's heading reads "${EN.foundOnMachine}"`, await main.getByText(EN.foundOnMachine, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the check button reads "${EN.checkAgain}"`, await main.getByRole("button", { name: EN.checkAgain, exact: true }).first().isVisible().catch(() => false), "");
  check(`the context field is labelled "${EN.contextLabel}"`, await main.getByLabel(EN.contextLabel, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the GPU sharing note reads its English bytes`, await main.getByText(EN.sharesGpu, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the test button reads "${EN.sendTest}"`, await main.getByRole("button", { name: EN.sendTest, exact: true }).first().isVisible().catch(() => false), "");
  check(`the placeholder section's switch is labelled with "${EN.demoSettingName}"`, await main.getByText(EN.demoSettingName, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the Connectors section title reads its English bytes`, await main.getByText(EN.connectorsTitle, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the Notifications section title reads "${EN.notificationsTitle}"`, await main.getByText(EN.notificationsTitle, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the Security section title reads "${EN.securityTitle}"`, await main.getByText(EN.securityTitle, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the Auto image section title reads "${EN.autoTitle}"`, await main.getByText(EN.autoTitle, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the About section's description reads its English bytes`, await main.getByText(EN.aboutDesc, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the strip's engine chip says "${EN.engineChip}"`, await main.getByText(EN.engineChip, { exact: true }).first().isVisible().catch(() => false), "");
  guideOpen = await page.locator("#get-started").isVisible().catch(() => false);
  if (guideOpen) console.log("  (skipped the Setup guide button check: the first-run guide is open here, so the strip hides its button)");
  else check(`the strip's setup button reads "${EN.setupGuide}"`, await main.getByRole("button", { name: EN.setupGuide, exact: true }).first().isVisible().catch(() => false), "");
  check(`the idle fal button's accessible name reads "Test ${EN.falLabel}"`, await main.getByRole("button", { name: `Test ${EN.falLabel}`, exact: true }).first().isVisible().catch(() => false), "");
  check(`the engine mode radio group's aria-label reads "${EN.engineTitle}"`, await page.getByRole("radiogroup", { name: EN.engineTitle, exact: true }).first().isVisible().catch(() => false), "");
}

const beforePath = mode === "gate" ? first : undefined;
const after = await rects();
if (beforePath && fs.existsSync(beforePath)) {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")).rects;
  let worst = 0;
  const rows = [];
  for (const [sel, a] of Object.entries(after)) {
    const b = before[sel];
    if (!b) continue;
    const d = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    rows.push(`${sel} Δ${d}`);
    worst = Math.max(worst, d);
  }
  check(`rect regression vs the pre-wiring render ≤ 1px (worst Δ${worst})`, worst <= 1, rows.filter((r) => !r.endsWith("Δ0")).join(" | "));
} else {
  console.log(`  (no before.json given — rect gate skipped)`);
}

console.log("- /settings: 한국어 in ONE render (no reload)");
{
  const main = page.locator("main").first();
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
  const trigger = page.locator("button:has(svg.lucide-globe)").locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(300);
  check("still /settings — no reload happened", page.url().endsWith("/settings"), page.url());
  check("<html lang> is ko right after the click", (await page.evaluate(() => document.documentElement.lang)) === "ko", "");

  const korean = [
    ["Engine section title", KO.engineTitle, "text"],
    ["engine card", KO.bothTitle, "text"],
    ["needs line", KO.bothNeeds, "text"],
    ["Paid API title", KO.cloudTitle, "text"],
    ["fal label", KO.falLabel, "label"],
    ["key link", KO.getKey, "link"],
    ["provider label", KO.providerLabel, "label"],
    ["ComfyUI title", KO.comfyTitle, "text"],
    ["LoRAs title", KO.lorasTitle, "text"],
    ["Training title", KO.trainingTitle, "text"],
    ["AI helper title", KO.textAiTitle, "text"],
    ["Use label", KO.useLabel, "label"],
    ["local server label", KO.serverLabel, "text"],
    ["found heading", KO.foundOnMachine, "text"],
    ["check button", KO.checkAgain, "button"],
    ["context label", KO.contextLabel, "label"],
    ["placeholder title", KO.demoTitle, "text"],
    ["placeholder setting", KO.demoSettingName, "text"],
    ["connectors title", KO.connectorsTitle, "text"],
    ["notifications title", KO.notificationsTitle, "text"],
    ["security title", KO.securityTitle, "text"],
    ["auto image title", KO.autoTitle, "text"],
    ["models title", KO.modelsTitle, "text"],
    ["about desc", KO.aboutDesc, "text"],
    ["engine chip", KO.engineChip, "text"],
    ["idle fal button's name", `테스트 ${KO.falLabel}`, "buttonExact"],
  ];
  for (const [what, value, kind] of korean) {
    const byKind =
      kind === "text"
        ? main.getByText(value, { exact: true }).first()
        : kind === "label"
          ? main.getByLabel(value, { exact: true }).first()
          : kind === "link"
            ? main.getByRole("link", { name: value, exact: true }).first()
            : kind === "button"
              ? main.getByRole("button", { name: value, exact: true }).first()
              : kind === "buttonExact"
                ? main.getByRole("button", { name: value, exact: true }).first()
                : main.getByText(value, { exact: true }).first();
    check(`${what} is Korean "${value}"`, await byKind.isVisible().catch(() => false), "");
  }
  // The ComfyUI description's tail fragment, joined after the link in one text run.
  check(`the ComfyUI description's tail is Korean`, await main.getByText(KO.comfyTail).first().isVisible().catch(() => false), "");
  if (!guideOpen) check(`the strip's setup button is Korean "${KO.setupGuide}"`, await main.getByRole("button", { name: KO.setupGuide, exact: true }).first().isVisible().catch(() => false), "");

  // English leftovers the card names as must-go (brand names like fal.ai/Replicate/Claude stay, by design).
  for (const gone of [EN.engineTitle, EN.cloudTitle, EN.providerLabel, EN.comfyTitle, EN.lorasTitle, EN.trainingTitle, EN.textAiTitle, EN.serverLabel, EN.foundOnMachine, EN.contextLabel, EN.demoTitle, EN.demoSettingName, EN.connectorsTitle, EN.notificationsTitle, EN.securityTitle, EN.autoTitle, EN.setupGuide, EN.saveAndTest, EN.bothTitle]) {
    check(`no English “${gone}” left after the switch`, !(await main.getByText(gone, { exact: true }).first().isVisible().catch(() => false)), "");
  }
}

check("nothing was missed (no missing-key warning, no page error)", noise.filter((l) => /\[i18n\]|pageerror/.test(l)).length === 0, noise.join(" | "));

await browser.close();
if (problems.length) {
  console.log(`\n${problems.length} FAILED:\n` + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log("\nsettings-form-i18n: all checks passed");
