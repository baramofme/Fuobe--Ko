// @vitest-environment jsdom
import { act } from "react";
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * useModeChoice: what new chats start in, what a browser remembers, and how a pick reaches every
 * open composer. Runs against jsdom with React's act() so the store round-trips for real.
 */
import { useModeChoice } from "@/components/assist/mode-picker";
import type { AssistModeChoice } from "@/lib/assist";

const KEY = "fuobe:assist-mode";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Renders the current choice as text, plus a button that picks Manual · local · Dense. */
function Harness({ defaultMode }: { defaultMode?: AssistModeChoice["mode"] }) {
  const [choice, set] = useModeChoice(defaultMode);
  return createElement(
    "div",
    null,
    createElement("p", { className: "choice" }, choice ? JSON.stringify(choice) : "none"),
    createElement("button", { onClick: () => set({ mode: "manual", agent: "local", model: "Dense", effort: null }) }, "pick"),
  );
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

const show = (host: HTMLElement) => host.querySelector<HTMLParagraphElement>(".choice")!.textContent;
const pick = (host: HTMLElement) => host.querySelector<HTMLButtonElement>("button")!;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  act(() => void roots.map((r) => r.unmount()));
  roots.length = 0;
  document.body.innerHTML = "";
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("what a fresh browser sees", () => {
  it("holds nothing until the server says a default", () => {
    const host = mount(createElement(Harness));
    expect(show(host)).toBe("none");
  });

  it("starts in the server's default when nothing is remembered", () => {
    const host = mount(createElement(Harness, { defaultMode: "free" }));
    expect(show(host)).toBe(JSON.stringify({ mode: "free" }));
  });
});

describe("what a remembered browser sees", () => {
  it("restores the saved choice", () => {
    const saved: AssistModeChoice = { mode: "manual", agent: "hosted", provider: "openai", model: "gpt-6", effort: "low" };
    localStorage.setItem(KEY, JSON.stringify(saved));
    const host = mount(createElement(Harness));
    expect(show(host)).toBe(JSON.stringify(saved));
  });

  it("reads a choice saved when the local agent was called 'ollama' as 'local'", () => {
    localStorage.setItem(KEY, JSON.stringify({ mode: "manual", agent: "ollama", provider: null, model: "llama3", effort: null }));
    const host = mount(createElement(Harness));
    expect(show(host)).toBe(JSON.stringify({ mode: "manual", agent: "local", provider: null, model: "llama3", effort: null }));
  });

  it("falls back to the default when the saved value is not JSON", () => {
    localStorage.setItem(KEY, "{not json");
    const host = mount(createElement(Harness, { defaultMode: "smart" }));
    expect(show(host)).toBe(JSON.stringify({ mode: "smart" }));
    const bare = mount(createElement(Harness));
    expect(show(bare)).toBe("none");
  });

  it("ignores a saved value with no mode in it", () => {
    localStorage.setItem(KEY, JSON.stringify({ agent: "local", model: "Dense" }));
    const host = mount(createElement(Harness, { defaultMode: "free" }));
    expect(show(host)).toBe(JSON.stringify({ mode: "free" }));
  });

  // Regression for E1 (t_06240b78): a tampered LS value whose mode is not in ASSIST_MODES
  // must fall through to the server default, not crash <Icon /> in the chip.
  it("drops an unknown saved mode and uses the server default instead", () => {
    localStorage.setItem(KEY, JSON.stringify({ mode: "weird-mode" }));
    const host = mount(createElement(Harness, { defaultMode: "free" }));
    expect(show(host)).toBe(JSON.stringify({ mode: "free" }));
  });

  it("drops an unknown saved mode and falls through to null without a default", () => {
    localStorage.setItem(KEY, JSON.stringify({ mode: "weird-mode", agent: "local", model: "Dense" }));
    const host = mount(createElement(Harness));
    expect(show(host)).toBe("none");
  });

  it("accepts every valid ASSIST_MODES id as a saved value", () => {
    // Guard against a regression that also rejects the *good* modes.
    for (const valid of ["smart", "free", "manual"] as const) {
      localStorage.setItem(KEY, JSON.stringify({ mode: valid }));
      const host = mount(createElement(Harness, { defaultMode: "smart" }));
      expect(show(host)).toBe(JSON.stringify({ mode: valid }));
    }
  });
});

describe("picking", () => {
  it("persists to this browser and updates every open composer", () => {
    const a = mount(createElement(Harness));
    const b = mount(createElement(Harness));
    act(() => void pick(a).click());
    const picked = JSON.stringify({ mode: "manual", agent: "local", model: "Dense", effort: null });
    expect(show(a)).toBe(picked);
    expect(show(b)).toBe(picked);
    expect(localStorage.getItem(KEY)).toBe(picked);
  });

  it("follows what another tab wrote", () => {
    const a = mount(createElement(Harness));
    const other = JSON.stringify({ mode: "free" });
    localStorage.setItem(KEY, other);
    act(() => void window.dispatchEvent(new StorageEvent("storage", { key: KEY })));
    expect(show(a)).toBe(other);
  });

  it("keeps the choice in a browser that blocks localStorage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const a = mount(createElement(Harness));
    const b = mount(createElement(Harness));
    const picked = JSON.stringify({ mode: "manual", agent: "local", model: "Dense", effort: null });
    act(() => void pick(a).click()); // setItem throws inside set(); the in-memory fallback carries it
    expect(show(a)).toBe(picked);
    expect(show(b)).toBe(picked);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    // Remounting reads the fallback instead of crashing on the accessor.
    const c = mount(createElement(Harness));
    expect(show(c)).toBe(picked);
  });
});
