// Your keys i18n gate (the lane's browser gate): an account's /settings → Your keys must switch to
// Korean in ONE render (no reload) from English, leaking no English, then round-trip the saved key's
// value back to English on the way back. Boots its own `next dev` (BYO-style: app 3410, stand-in fal.ai
// 3411, Replicate 3412) so the worktree's own dev never runs at the same time. No real key, no paid call.
//
//   node tests/e2e/your-keys-i18n.mjs [screenshots folder]
//
// YKI_PORT moves all three (app, fal.ai, Replicate on the next two) when 3410-3412 are taken.
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DESKTOP, launch, openRoute, root } from "./_browser.mjs";
import { startFakeFal, startFakeReplicate } from "../helpers/fake-cloud.ts";
import { tempDir, removeDir } from "./_temp.mjs";

const APP_PORT = Number(process.env.YKI_PORT ?? 3410);
const APP = `http://127.0.0.1:${APP_PORT}`;
const shots = path.resolve(process.argv[2] ?? fs.mkdtempSync(path.join(os.tmpdir(), "fuobe-yki-shots-")));
fs.mkdirSync(shots, { recursive: true });
const data = tempDir("fuobe-yki-data-");
const logFile = path.join(shots, "server.log");

const PASSWORD = "owner password for the gate";
const OWNER_ENV = { FAL_KEY: "owner-gate-key:owner-gate-secret", REPLICATE_API_TOKEN: "r8_ownerGateToken" };
const ACCT_FAL = "acct-gate-key-id:acct-gate-secret-9f3a";

const problems = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const noise = [];

const fal = await startFakeFal(APP_PORT + 1);
const rep = await startFakeReplicate(APP_PORT + 2);
fal.keys[ACCT_FAL] = "good";
rep.keys[OWNER_ENV.REPLICATE_API_TOKEN] = "good";

const log = fs.openSync(logFile, "w");
const server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "-p", String(APP_PORT), "-H", "127.0.0.1"], {
  cwd: root,
  env: {
    ...process.env,
    ...OWNER_ENV,
    NODE_ENV: "development",
    FUOBE_DATA_DIR: data,
    FUOBE_PASSWORD: PASSWORD,
    FUOBE_PUBLIC_SIGNUP: "1",
    FUOBE_DEV_FAL_URL: fal.url,
    FUOBE_DEV_REPLICATE_URL: rep.url,
    COMFYUI_URL: "http://127.0.0.1:9",
    FUOBE_ACCOUNT_DISK_FREE_GB: "0",
    FUOBE_HOSTED_RUNS: "",
    FUOBE_HOSTED_FREE: "",
  },
  stdio: ["ignore", log, log],
});

async function stopAll() {
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
    else server.kill("SIGTERM");
  } catch {}
  await fal.close();
  await rep.close();
}

/** fetch with a cookie jar of one cookie. */
const api = async (route, { method = "GET", body, cookie } = {}) => {
  const res = await fetch(APP + route, { method, headers: { "Content-Type": "application/json", Origin: APP }, ...(body !== undefined && { body: JSON.stringify(body) }), ...(cookie && { cookie }) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json, headers: res.headers };
};
const cookieOf = (res) => /fuobe_session=[^;]+/.exec(res.headers.get("set-cookie") ?? "")?.[0];

const EN = {
  title: "Your keys",
  intro: "Add your fal.ai or Replicate key to use Nano Banana, Kling, Veo and more. You pay the provider directly. Your key is stored encrypted.",
  limits: "Up to 4 runs at once and 60 an hour.",
  blurb: "One key runs almost every paid model.",
  replace: "Replace",
  checkAgain: "Check again",
  remove: "Remove",
};
const KO = {
  title: "내 키",
  intro: "Nano Banana, Kling, Veo 등을 쓰려면 fal.ai 또는 Replicate 키를 추가하세요. 요금은 제공업체에 직접 지불하고, 키는 암호화되어 저장됩니다.",
  limits: "최대 동시 4개, 시간당 60개.",
  blurb: "키 하나로 대부분의 유료 모델을 실행할 수 있습니다.",
  replace: "교체",
  checkAgain: "다시 확인",
  remove: "삭제",
};

const main = (p) => p.locator("main").first();

try {
  // The server is up (first compile can take a while).
  for (let i = 0; i < 240; i++) {
    try {
      const r = await fetch(`${APP}/login`);
      if (r.status < 500) break;
    } catch {}
    await wait(1000);
  }

  // An account signs up and saves a good fal.ai key, so the saved key's card and account details render.
  const signup = await api("/api/auth/signup", { method: "POST", body: { email: "gate@example.com", password: "account password" } });
  const acct = cookieOf(signup);
  check("an account signs up", !!acct, "");

  const browser = await launch();
  const [name, value] = acct.split("=");
  const ctx = await browser.newContext({ ...DESKTOP, baseURL: APP });
  await ctx.addCookies([{ name, value, url: APP }]);
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "warning" || m.type() === "error") noise.push(`console.${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => noise.push(`pageerror: ${e.message}`));

  await openRoute(page, `${APP}/settings#your-keys`);
  check("the page is /settings", page.url().includes("/settings"), page.url());
  await page.getByRole("heading", { name: EN.title, exact: true }).waitFor({ timeout: 60_000 });

  // Save a good key: the card flips to its saved state (last 4 characters, account details, Replace/Check again/Remove).
  await page.getByLabel("fal.ai API key").fill(ACCT_FAL);
  await page.getByRole("button", { name: EN.checkAndSave ?? "Check and save" }).first().click();
  await page.getByText("Key ending in").first().waitFor({ timeout: 30_000 });
  check("a good key is saved and shown by its last 4 characters", (await page.content()).includes("9f3a"), "");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(shots, "your-keys-saved-en.png") });

  // English first, byte-identical: the wired strings read their original bytes.
  check(`the heading reads "${EN.title}"`, await main(page).getByRole("heading", { name: EN.title, exact: true }).first().isVisible().catch(() => false), "");
  check(`the intro reads its English bytes`, await main(page).getByText(EN.intro, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the limits read "${EN.limits}"`, await main(page).getByText(EN.limits, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the fal card blurbs "${EN.blurb}"`, await main(page).getByText(EN.blurb, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the saved key card offers "${EN.replace}"`, await main(page).getByRole("button", { name: EN.replace, exact: true }).first().isVisible().catch(() => false), "");
  check(`the saved key card offers "${EN.checkAgain}"`, await main(page).getByRole("button", { name: EN.checkAgain, exact: true }).first().isVisible().catch(() => false), "");
  check(`the saved key card offers "${EN.remove}"`, await main(page).getByRole("button", { name: EN.remove, exact: true }).first().isVisible().catch(() => false), "");

  console.log("- /settings (account): 한국어 in ONE render (no reload)");
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
  const trigger = page.locator("button:has(svg.lucide-globe)").locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(350);

  check("still /settings — no reload happened", page.url().includes("/settings"), page.url());
  check("<html lang> is ko right after the click", (await page.evaluate(() => document.documentElement.lang)) === "ko", await page.evaluate(() => document.documentElement.lang));
  await page.screenshot({ path: path.join(shots, "your-keys-saved-ko.png") });

  // Korean, same render: the wired strings switched.
  check(`the heading is Korean "${KO.title}"`, await main(page).getByRole("heading", { name: KO.title, exact: true }).first().isVisible().catch(() => false), "");
  check(`the intro is Korean`, await main(page).getByText(KO.intro, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the limits are Korean "${KO.limits}"`, await main(page).getByText(KO.limits, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the fal card blurbs in Korean`, await main(page).getByText(KO.blurb, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the saved key card offers Korean "${KO.replace}"`, await main(page).getByRole("button", { name: KO.replace, exact: true }).first().isVisible().catch(() => false), "");
  check(`the saved key card offers Korean "${KO.checkAgain}"`, await main(page).getByRole("button", { name: KO.checkAgain, exact: true }).first().isVisible().catch(() => false), "");
  check(`the saved key card offers Korean "${KO.remove}"`, await main(page).getByRole("button", { name: KO.remove, exact: true }).first().isVisible().catch(() => false), "");

  // No English of the wired strings left after the switch.
  for (const gone of [EN.title, EN.intro, EN.limits, EN.blurb]) {
    check(`no English “${gone}” left after the switch`, !(await main(page).getByText(gone, { exact: true }).first().isVisible().catch(() => false)), "");
  }
  for (const gone of [EN.replace, EN.checkAgain, EN.remove]) {
    check(`no English button “${gone}” left after the switch`, !(await main(page).getByRole("button", { name: gone, exact: true }).first().isVisible().catch(() => false)), "");
  }

  // Skill 9b round-trip: switch back to English. The saved key's value survives, and the wired labels return in English
  // in one render (the value is provider data, language-neutral; the labels react).
  console.log("- round-trip back to English: saved value survives, labels return");
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
  await trigger.click();
  await page.getByRole("menuitem", { name: /English/i }).first().click();
  await page.waitForTimeout(350);
  check("<html lang> is back to en", (await page.evaluate(() => document.documentElement.lang)) === "en", await page.evaluate(() => document.documentElement.lang));
  check("the saved key's last 4 characters round-tripped (still 9f3a)", (await page.content()).includes("9f3a"), "");
  check(`the heading is back in English "${EN.title}"`, await main(page).getByRole("heading", { name: EN.title, exact: true }).first().isVisible().catch(() => false), "");
  check(`the intro is back in English`, await main(page).getByText(EN.intro, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the saved key card offers English "${EN.replace}" again`, await main(page).getByRole("button", { name: EN.replace, exact: true }).first().isVisible().catch(() => false), "");
  await page.screenshot({ path: path.join(shots, "your-keys-roundtrip-en.png") });

  await page.close();
  await ctx.close();

  console.log("- nothing was missed (no missing-key warning, no page error)");
  {
    const i18nNoise = noise.filter((l) => /\[i18n\]/.test(l));
    check("no missing-key warning", i18nNoise.length === 0, i18nNoise.join(" | "));
    const pageErrors = noise.filter((l) => /pageerror/.test(l));
    check("no page error", pageErrors.length === 0, pageErrors.join(" | "));
  }

  await browser.close();
} finally {
  await stopAll();
  removeDir(data);
}

if (problems.length) {
  console.log(`\n${problems.length} FAILED:\n` + problems.map((p) => `  ${p}`).join("\n"));
  console.log(`\nscreenshots: ${shots}\nserver log: ${logFile}`);
  process.exit(1);
}
console.log(`\nyour-keys-i18n: all checks passed\nscreenshots: ${shots}`);
