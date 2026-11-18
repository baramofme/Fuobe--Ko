// @vitest-environment jsdom
import { act, createElement, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

/**
 * What ModePicker renders and does, driven through real DOM clicks: the chip, the Mode row,
 * Manual's model list (empty, single, filtered), keyboard travel, rapid switching, and the
 * apply-on-close draft an existing chat keeps.
 */
import { ModePicker } from "@/components/assist/mode-picker";
import { ASSIST_MODES, type AssistAvailability, type AssistModeChoice, type AssistModelOption } from "@/lib/assist";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// Radix positions its popper with floating-ui, which watches resize via ResizeObserver; jsdom has none.
if (!("ResizeObserver" in globalThis)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

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

/** A stand-in parent that does what every consumer does: keeps the choice, hands it back down, logs every pick. */
function Host(props: {
  can?: AssistAvailability;
  initial?: AssistModeChoice | null;
  applyOnClose?: boolean;
  disabled?: boolean;
  log: AssistModeChoice[];
}) {
  const [choice, setChoice] = useState<AssistModeChoice | null>(props.initial ?? null);
  return createElement(ModePicker, {
    value: choice,
    onChange: (c) => {
      props.log.push(c);
      setChoice(c);
    },
    availability: props.can,
    applyOnClose: props.applyOnClose,
    disabled: props.disabled,
  });
}

const roots: Root[] = [];

function mount(ui: ReactNode): HTMLElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => void root.render(ui));
  return host;
}

afterEach(() => {
  act(() => void roots.map((r) => r.unmount()));
  roots.length = 0;
  document.body.innerHTML = "";
});

const chip = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('[data-slot="popover-trigger"]')!;
const open = (host: HTMLElement) => act(() => void chip(host).click());
const content = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]');
const click = (el: Element | null | undefined) => act(() => void (el as HTMLElement).click());
/**
 * A real outside interaction — how Radix dismisses a popover: pointerdown sets the "outside"
 * flag (deferred for button 0), the click that follows releases the deferred dismiss.
 * The layer only starts watching pointerdown one tick after mount, so wait for it.
 */
const dismiss = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10)); // let the layer's pointerdown listener attach
    document.body.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 }));
    document.body.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
  });
};

const groupByLabel = (aria: string) =>
  [...(content()?.querySelectorAll('[role="radiogroup"]') ?? [])].find((g) => g.getAttribute("aria-label") === aria) as HTMLElement;
const modeRadios = () => [...groupByLabel("Mode").querySelectorAll('[role="radio"]')] as HTMLButtonElement[];
const modelRadios = () => [...groupByLabel("Model").querySelectorAll('[role="radio"]')] as HTMLButtonElement[];
const effortRadios = () => [...groupByLabel("Effort").querySelectorAll('[role="radio"]')] as HTMLButtonElement[];
const pressKey = (el: HTMLElement, key: string) => act(() => void el.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })));

/** Types into the React-controlled find box the way a user does. */
const typeInto = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
};

describe("the chip", () => {
  it("shows Smart until anything is picked", () => {
    const host = mount(createElement(Host, { log: [] }));
    const trigger = chip(host);
    expect(trigger.disabled).toBe(false);
    expect(trigger.textContent).toContain("Smart");
    expect(trigger.getAttribute("aria-label")).toBe("Mode: Smart");
    expect(trigger.querySelector("svg")!.getAttribute("class")).toContain("lucide-sparkles");
  });

  it("follows the server's default and the saved choice, icon and all", () => {
    const host = mount(createElement(Host, { log: [], can: can({ defaultMode: "free" }) }));
    expect(chip(host).textContent).toContain("Free");
    expect(chip(host).querySelector("svg")!.getAttribute("class")).toContain("lucide-cpu");
    const manual = mount(createElement(Host, { log: [], initial: { mode: "manual", agent: "offline" } }));
    expect(chip(manual).textContent).toContain("Offline planner");
    expect(chip(manual).querySelector("svg")!.getAttribute("class")).toContain("lucide-gauge");
  });

  it("stays shut when it is disabled", () => {
    const host = mount(createElement(Host, { log: [], disabled: true }));
    expect(chip(host).disabled).toBe(true);
    chip(host).click();
    expect(content()).toBeNull();
  });
});

describe("opening the menu", () => {
  it("offers three modes, checks the one in use, and marks only it a Tab stop", () => {
    const host = mount(createElement(Host, { log: [], can: can({ smart: { plan: model({ agent: "claude", model: "claude-opus-5-5", name: "Claude Opus 5.5" }), check: null, text: "Claude Opus 5.5 plans." } }) }));
    open(host);
    const radios = modeRadios();
    expect(radios.map((r) => r.textContent)).toEqual(ASSIST_MODES.map((m) => m.label));
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    // The mode's own explanation rides under the row.
    expect(content()!.textContent).toContain(ASSIST_MODES[0].hint);
  });

  it("leads with the banner when the AI helper is off", () => {
    const host = mount(createElement(Host, { log: [], can: can({ aiOff: true }) }));
    open(host);
    expect(content()!.textContent).toContain("The AI helper is off in ");
    expect(content()!.querySelector("a")!.textContent).toBe("Settings");
    expect(content()!.textContent).toContain(", so every chat uses the offline planner.");
  });

  it("picks a mode straight through to the parent", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(Host, { log, can: can() }));
    open(host);
    click(modeRadios()[1]); // Free
    expect(log).toEqual([{ mode: "free" }]);
    expect(modeRadios()[1].getAttribute("aria-checked")).toBe("true");
    expect(chip(host).textContent).toContain("Free");
  });
});

describe("Smart when nothing is connected", () => {
  it("can't be picked, shows why, and the chip reads the Free it runs as", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(Host, { log, can: can(), initial: { mode: "smart" } }));
    open(host);
    const radios = modeRadios();
    expect(radios[0].disabled).toBe(true);
    expect(radios[0].title).toBe("Nothing is connected yet.");
    // The saved Smart reads as the Free it actually runs as.
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(content()!.textContent).toContain("Open Settings");
    expect(chip(host).textContent).toContain("Free");
  });

  it("Manual without anything falls through to the offline planner", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(Host, { log, can: can() }));
    open(host);
    click(modeRadios()[2]);
    expect(log).toEqual([{ mode: "manual", agent: "offline" }]);
    expect(chip(host).textContent).toContain("Offline planner");
  });
});

describe("Manual's model list", () => {
  it("with nothing connected offers just the offline planner", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(Host, { log, can: can() }));
    open(host);
    click(modeRadios()[2]);
    const radios = modelRadios();
    expect(radios).toHaveLength(1);
    expect(radios[0].textContent).toContain("Offline planner");
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect(radios[0].title).toBe(""); // not disabled
    expect(content()!.textContent).toContain("No LLM");
    expect(content()!.textContent).toContain("Rules, no LLM — simple requests only");
    expect(content()!.querySelector('input[type="search"]')).toBeNull(); // only one option: no find box
  });

  it("a local server with one default model lists exactly that one, picked", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(
      createElement(Host, { log, can: can({ local: { kind: "lmstudio", label: "LM Studio", ok: true, models: [], model: "Dense" } }) }),
    );
    open(host);
    click(modeRadios()[2]); // Manual → manualStart picks the local agent
    const radios = modelRadios();
    expect(radios).toHaveLength(2); // Dense plus the offline planner, which is always offered
    const dense = radios.find((r) => r.textContent.includes("Dense"))!;
    expect(dense.getAttribute("aria-checked")).toBe("true");
    expect(radios[1].textContent).toContain("Offline planner");
    expect(content()!.textContent).toContain("LM Studio · On this machine");
    expect(dense.textContent).toContain("Local, through LM Studio · free");
    expect(content()!.querySelector('[role="radiogroup"][aria-label="Effort"]')).toBeNull();
  });

  it("a cloud-named local model says it costs", () => {
    const host = mount(
      createElement(Host, {
        log: [],
        can: can({ local: { kind: "ollama", label: "Ollama", ok: true, models: ["mistral-cloud"], model: "mistral-cloud" } }),
        initial: { mode: "manual", agent: "local", model: "mistral-cloud" },
      }),
    );
    open(host);
    expect(content()!.textContent).toContain("Ollama Cloud · paid, through Ollama");
  });

  it("a model that can't be picked yet says why, and the Tab stop skips it", () => {
    const host = mount(
      createElement(Host, {
        log: [],
        can: can({
          manual: { groups: [{ id: "openai", label: "OpenAI", status: "Key set", models: [model({ disabled: "Needs a key" }), model({ model: "gpt-6.1", name: "GPT-6.1" })] }], missing: [] },
        }),
        initial: { mode: "manual", agent: "hosted", provider: "openai", model: "gpt-6.1" },
      }),
    );
    open(host);
    const radios = modelRadios();
    expect(radios).toHaveLength(3); // GPT-6 (blocked), GPT-6.1 (picked), the offline planner
    const blocked = radios[0];
    const picked = radios[1];
    expect(blocked.textContent).toContain("GPT-6");
    expect(blocked.disabled).toBe(true);
    expect(blocked.title).toBe("Needs a key");
    expect(blocked.textContent).toContain("Needs a key"); // the reason rides under the name
    expect(blocked.tabIndex).toBe(-1);
    expect(picked.textContent).toContain("GPT-6.1");
    expect(picked.tabIndex).toBe(0); // the picked, pickable option is the Tab stop
    click(blocked);
    expect(picked.getAttribute("aria-checked")).toBe("true"); // click does nothing to state
  });

  it("a hosted model shows only the efforts it offers", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(
      createElement(Host, {
        log,
        can: can({ manual: { groups: [{ id: "openai", label: "OpenAI", status: "Key set", models: [model({ efforts: ["medium", "high"] })] }], missing: [] } }),
        initial: { mode: "manual", agent: "hosted", provider: "openai", model: "gpt-6", effort: "medium" },
      }),
    );
    open(host);
    const radios = effortRadios();
    expect(radios).toHaveLength(5);
    expect(radios.map((r) => r.disabled)).toEqual([true, false, false, true, true]); // low / medium / high / extra / max
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false", "false", "false"]);
    click(radios[2]); // High
    expect(log).toEqual([{ mode: "manual", agent: "hosted", provider: "openai", model: "gpt-6", effort: "high" }]);
    click(radios[0]); // Low isn't offered → nothing happens
    expect(log).toHaveLength(1);
    expect(chip(host).textContent).toContain("GPT-6 · High");
  });

  it("Claude offers every effort and names itself without the brand", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(
      createElement(Host, {
        log,
        can: can({ claude: true, manual: { groups: [{ id: "anthropic", label: "Anthropic", status: "Key set", models: [model({ agent: "claude", model: "claude-sonnet-5-5", name: "Claude Sonnet 5.5" })] }], missing: [] } }),
        initial: { mode: "manual", agent: "claude" },
      }),
    );
    open(host);
    const sonnet = modelRadios().find((r) => r.textContent.includes("Sonnet"))!;
    click(sonnet);
    expect(log).toEqual([{ mode: "manual", agent: "claude", provider: null, model: "claude-sonnet-5-5" }]);
    expect(effortRadios()).toHaveLength(5); // Claude takes all of them
    expect(chip(host).textContent).toContain("Sonnet 5.5 · Medium");
  });

  it("says which keys are missing and what the open-only engine allows", () => {
    const host = mount(createElement(Host, { log: [], can: can({ openOnly: true, manual: { groups: [], missing: [{ id: "openai", label: "OpenAI" }] } }), initial: { mode: "manual", agent: "offline" } }));
    open(host);
    expect(content()!.textContent).toContain("Add a key:");
    const addKey = [...content()!.querySelectorAll('a')].find((a) => a.textContent.includes("OpenAI"))!;
    expect(addKey.getAttribute("href")).toBe("/settings#llm-providers");
    expect(content()!.textContent).toContain("Open source only: open-weight models that cost nothing");
    expect(content()!.textContent).toContain(". Nothing goes to a paid API.");
    // Free mode is exempt from the open-only note.
    const free = mount(createElement(Host, { log: [], can: can({ openOnly: true }), initial: { mode: "free" } }));
    open(free);
    expect(content()!.textContent).not.toContain("Open source only");
  });
});

describe("switching fast", () => {
  const rich = can({
    smart: { plan: model({ agent: "claude", model: "claude-opus-5-5", name: "Claude Opus 5.5" }), check: null, text: "Claude Opus 5.5 plans." },
    local: { kind: "ollama", label: "Ollama", ok: true, models: ["Dense"], model: "Dense" },
  });

  it("lands each click in order and ends where the last one pointed", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(Host, { log, can: rich }));
    open(host);
    act(() => {
      modeRadios()[0].click(); // Smart (was already smart → same value again)
      modeRadios()[1].click(); // Free
      modeRadios()[2].click(); // Manual → starts on Smart's model (Claude)
    });
    expect(log.map((c) => c.mode)).toEqual(["smart", "free", "manual"]);
    expect(log[2].agent).toBe("claude");
    expect(modeRadios()[2].getAttribute("aria-checked")).toBe("true");
    expect(chip(host).textContent).toContain("Opus 5.5"); // Manual opened on Smart's model
  });

  it("opens and closes without a pick changes nothing", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(Host, { log, can: rich, initial: { mode: "free" } }));
    act(() => {
      chip(host).click();
      chip(host).click();
      chip(host).click();
    });
    expect(log).toHaveLength(0);
    expect(chip(host).textContent).toContain("Free");
  });
});

describe("applyOnClose (an existing chat)", () => {
  it("holds the pick as a draft until the menu closes", async () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(Host, { log, can: can({ local: { kind: "lmstudio", label: "LM Studio", ok: true, models: ["Dense"], model: "Dense" } }), initial: { mode: "free" }, applyOnClose: true }));
    open(host);
    click(modeRadios()[2]); // Manual
    expect(log).toHaveLength(0); // not sent yet
    expect(content()!.textContent).toContain("Applies to this chat when you close this menu.");
    expect(modeRadios()[2].getAttribute("aria-checked")).toBe("true"); // the draft shows inside the menu
    await dismiss();
    expect(log).toEqual([{ mode: "manual", agent: "local" }]); // sent once, on close
    expect(chip(host).getAttribute("aria-expanded")).toBe("false");
  });

  it("a draft equal to what the chat already has isn't re-sent", async () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(Host, { log, can: can(), initial: { mode: "manual", agent: "offline" }, applyOnClose: true }));
    open(host); // draft = the chat's choice
    await dismiss(); // nothing was touched
    expect(log).toHaveLength(0);
    open(host); // reopening resets to the chat's choice…
    expect(modeRadios()[2].getAttribute("aria-checked")).toBe("true");
    await dismiss(); // …and closing still sends nothing
    expect(log).toHaveLength(0);
  });

  it("Escape closes and sends the draft", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(Host, { log, can: can(), initial: { mode: "free" }, applyOnClose: true }));
    open(host);
    click(modeRadios()[2]);
    pressKey(content()!.querySelector("button")!, "Escape"); // Radix dismisses on Escape inside the menu
    expect(log).toEqual([{ mode: "manual", agent: "offline" }]);
  });
});

describe("keyboard travel", () => {
  it("arrows, Home and End move and pick among the enabled modes", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(Host, { log, can: can(), initial: { mode: "free" } })); // Smart is off → Free and Manual are the stops
    open(host);
    const radios = modeRadios();
    expect(document.activeElement).not.toBe(radios[0]); // the disabled Smart never takes focus
    radios[1].focus();
    pressKey(radios[1], "ArrowRight");
    expect(document.activeElement).toBe(radios[2]);
    expect(log.at(-1)?.mode).toBe("manual");
    pressKey(radios[2], "ArrowRight"); // wraps to the first enabled one
    expect(document.activeElement).toBe(radios[1]);
    expect(log.at(-1)?.mode).toBe("free");
    pressKey(radios[1], "End");
    expect(document.activeElement).toBe(radios[2]);
    pressKey(radios[2], "Home");
    expect(document.activeElement).toBe(radios[1]);
  });
});

describe("the find box", () => {
  it("appears with a long list and narrows it as you type", () => {
    const many = {
      id: "openai",
      label: "OpenAI",
      status: "Key set",
      models: Array.from({ length: 13 }, (_, i) => model({ model: `m-${i + 1}`, name: `Model ${i + 1}` })),
    };
    const host = mount(createElement(Host, { log: [], can: can({ manual: { groups: [many], missing: [] } }), initial: { mode: "manual", agent: "offline" } }));
    open(host);
    const search = content()!.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(search.getAttribute("aria-label")).toBe("Find a model");
    expect(modelRadios()).toHaveLength(14); // 13 models + the offline planner
    typeInto(search, "m-3");
    expect(modelRadios()).toHaveLength(1);
    expect(modelRadios()[0].textContent).toContain("Model 3");
    expect(content()!.textContent).not.toContain("No LLM"); // the offline group doesn't match and drops out
    typeInto(search, "");
    expect(modelRadios()).toHaveLength(14); // clearing brings everything back
    expect(content()!.textContent).toContain("No LLM");
  });
});
