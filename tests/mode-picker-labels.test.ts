import { describe, expect, it } from "vitest";

/**
 * ModePicker's chip-label logic and the agent-name fix-up — pure functions, no browser needed.
 * Covers the default state, every mode's reading, the local/hosted/Claude fallbacks.
 */
import { modeChipLabel } from "@/components/assist/mode-picker";
import { normalizeAgent, type AssistAvailability, type AssistModelOption } from "@/lib/assist";

/** A full availability snapshot with sane "nothing connected" defaults; tests override what they care about. */
const can = (over: Partial<AssistAvailability> = {}): AssistAvailability => ({
  claude: false,
  local: { kind: null, label: "a local model", ok: false, models: [], model: null },
  aiOff: false,
  defaultMode: "smart",
  smart: { plan: null, check: null, text: "Nothing is connected yet." },
  free: { pick: null, text: "The offline planner answers.", caveat: undefined },
  manual: { groups: [], missing: [] },
  openOnly: false,
  checked: "2026-11-01",
  ...over,
});

/** A hosted model option with the same defaults the picker's fixtures pass. */
const model = (over: Partial<AssistModelOption> = {}): AssistModelOption => ({
  provider: "openai",
  model: "gpt-6",
  name: "GPT-6",
  providerLabel: "OpenAI",
  agent: "hosted",
  price: "$2 in",
  sees: true,
  free: false,
  efforts: [],
  ...over,
});

describe("modeChipLabel", () => {
  it("reads 'Mode' when there is no choice yet", () => {
    expect(modeChipLabel(null)).toBe("Mode");
    expect(modeChipLabel(null, can())).toBe("Mode");
  });

  it("reads 'Offline' while the AI helper is off, whatever was saved", () => {
    expect(modeChipLabel({ mode: "smart" }, can({ aiOff: true }))).toBe("Offline");
    expect(modeChipLabel({ mode: "manual", agent: "local", model: "Dense" }, can({ aiOff: true }))).toBe("Offline");
  });

  it("names Smart and Free straight off the mode", () => {
    expect(modeChipLabel({ mode: "smart" })).toBe("Smart");
    expect(modeChipLabel({ mode: "free", agent: "hosted", model: "x" })).toBe("Free");
  });

  it("shows the offline planner in Manual", () => {
    expect(modeChipLabel({ mode: "manual", agent: "offline" })).toBe("Offline planner");
  });

  it("shows a local model's name: picked, else the server default, else a bare 'Local'", () => {
    expect(modeChipLabel({ mode: "manual", agent: "local", model: "qwen3.8-flash-next" }, can())).toBe("qwen3.8-flash-next");
    expect(modeChipLabel({ mode: "manual", agent: "local", model: null }, can({ local: { kind: "lmstudio", label: "LM Studio", ok: true, models: ["Dense"], model: "Dense" } }))).toBe("Dense");
    expect(modeChipLabel({ mode: "manual", agent: "local" })).toBe("Local");
  });

  it("names a hosted model from the connected list; effort rides along only when it offers one", () => {
    const list = can({
      manual: {
        groups: [
          { id: "openai", label: "OpenAI", status: "Key set", models: [model({ model: "gpt-6", name: "GPT-6", efforts: [] }), model({ model: "gpt-6.1", name: "GPT-6.1", efforts: ["low", "medium", "high"] })] },
          { id: "other", label: "Other", status: "Key set", models: [] },
        ],
        missing: [],
      },
    });
    expect(modeChipLabel({ mode: "manual", agent: "hosted", provider: "openai", model: "gpt-6" }, list)).toBe("GPT-6");
    expect(modeChipLabel({ mode: "manual", agent: "hosted", provider: "openai", model: "gpt-6.1" }, list)).toBe("GPT-6.1 · Medium");
    expect(modeChipLabel({ mode: "manual", agent: "hosted", provider: "openai", model: "gpt-6.1", effort: "low" }, list)).toBe("GPT-6.1 · Low");
    // A model the list doesn't carry still names itself (its id) with the effort.
    expect(modeChipLabel({ mode: "manual", agent: "hosted", provider: "deepseek", model: "deepseek-v4" }, list)).toBe("deepseek-v4 · Medium");
    expect(modeChipLabel({ mode: "manual", agent: "hosted" })).toBe("Model · Medium");
  });

  it("names Claude without the brand, on the default model and effort", () => {
    expect(modeChipLabel({ mode: "manual", agent: "claude" })).toBe("Opus 5.5 · Medium");
    expect(modeChipLabel({ mode: "manual", agent: "claude", model: "claude-sonnet-5-5", effort: "high" })).toBe("Sonnet 5.5 · High");
    expect(modeChipLabel({ mode: "manual", agent: "claude", model: "claude-unknown-9" })).toBe("Claude · Medium");
  });
});

describe("normalizeAgent", () => {
  it("reads the old 'ollama' name as 'local'", () => {
    expect(normalizeAgent("ollama")).toBe("local");
  });

  it("passes the four real agents through", () => {
    for (const a of ["claude", "hosted", "local", "offline"] as const) expect(normalizeAgent(a)).toBe(a);
  });

  it("gives up on anything else", () => {
    expect(normalizeAgent("gpt")).toBeUndefined();
    expect(normalizeAgent("")).toBeUndefined();
    expect(normalizeAgent(null)).toBeUndefined();
    expect(normalizeAgent(undefined)).toBeUndefined();
  });
});

