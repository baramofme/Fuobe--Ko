// @vitest-environment jsdom
import { act, createElement, useState, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ModePicker inside its real parent: NewChatControls — the composer row of every new chat
 * (mode, engine, ask-first). A mode pick must reach the parent's setter and read back on the chip;
 * the row must also survive a server render and a missing availability snapshot.
 */
import { NewChatControls } from "@/components/assist-view";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AssistAvailability, AssistModeChoice } from "@/lib/assist";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
if (!("ResizeObserver" in globalThis)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/** The row's own fetches (status, engine mode, viewer…) get a harmless empty answer, never the network. */
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    () =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({}),
        text: async () => "",
      }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** A full availability snapshot with sane "nothing connected" defaults; tests override what they care about. */
const can = (over: Partial<AssistAvailability> = {}): AssistAvailability => ({
  claude: false,
  local: { kind: null, label: "a local model", ok: false, models: [], model: null },
  aiOff: false,
  defaultMode: "smart",
  smart: { plan: null, check: null, text: "Nothing is connected yet." },
  free: { pick: null, text: "The offline planner answers." },
  manual: { groups: [], missing: [] },
  openOnly: false,
  checked: "2026-11-01",
  ...over,
});

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Infinity } } });

/** What AssistView does around NewChatControls: the page owns the choice and hands it back down. */
function ComposerPage({
  can: availability,
  log,
}: {
  can?: AssistAvailability;
  log: AssistModeChoice[];
}) {
  const [choice, setChoice] = useState<AssistModeChoice | null>(null);
  const [engine, setEngine] = useState<"cloud" | "open">("cloud");
  const [askFirst, setAskFirst] = useState(true);
  return createElement(NewChatControls, {
    choice,
    setChoice: (c) => {
      log.push(c);
      setChoice(c);
    },
    can: availability,
    engine,
    setEngine,
    askFirst,
    setAskFirst,
  });
}

/** The providers the app root puts around every studio page (src/app/providers.tsx). */
function Providers({ children }: { children: ReactNode }) {
  // Radix and react-query type their children as a required prop; we hand them over the
  // createElement way, so the two providers are widened to plain function components.
  const Tip = TooltipProvider as FC<{ delayDuration?: number; children?: ReactNode }>;
  const Query = QueryClientProvider as FC<{ client: QueryClient; children?: ReactNode }>;
  return createElement(Tip, { delayDuration: 300 }, createElement(Query, { client: qc }, children));
}

const withProvider = (ui: ReactNode) => createElement(Providers, null, ui);

const roots: Root[] = [];

function mount(ui: ReactNode): HTMLElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => void root.render(withProvider(ui)));
  return host;
}

afterEach(() => {
  act(() => void roots.map((r) => r.unmount()));
  roots.length = 0;
  document.body.innerHTML = "";
});

const chip = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('[data-slot="popover-trigger"]')!;
const content = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]');
const open = (host: HTMLElement) => act(() => void chip(host).click());
const modeRadios = () =>
  [...(content()?.querySelectorAll('[role="radiogroup"]') ?? [])]
    .find((g) => g.getAttribute("aria-label") === "Mode")!
    .querySelectorAll<HTMLButtonElement>('[role="radio"]');

describe("the composer row", () => {
  it("carries the mode chip, the engine switch, and ask-first", () => {
    const host = mount(createElement(ComposerPage, { can: can(), log: [] }));
    // ModePicker's chip is mounted by the parent, first in the row: with nothing connected,
    // Smart reads as the Free it runs as.
    expect(chip(host).textContent).toContain("Free");
    expect(host.querySelectorAll('[data-slot="popover-trigger"]').length).toBe(1);
    // The engine switch and the ask-first switch sit next to it, untouched by the mode.
    expect(host.querySelector('[role="switch"]')).toBeTruthy();
    expect(host.querySelectorAll("button").length).toBeGreaterThanOrEqual(3);
  });

  it("a mode pick inside the menu lands in the parent and reads back on the chip", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(ComposerPage, { can: can(), log }));
    open(host);
    const radios = modeRadios();
    expect(radios).toHaveLength(3);
    act(() => void radios[1].click()); // Free
    expect(log).toEqual([{ mode: "free" }]); // the parent's setter got exactly the picker's choice
    expect(chip(host).textContent).toContain("Free"); // ...and the re-rendered row shows it
  });
});

describe("without the availability snapshot", () => {
  it("still renders the row and a usable menu", () => {
    const log: AssistModeChoice[] = [];
    const host = mount(createElement(ComposerPage, { log })); // can undefined, as before the chats API answers
    expect(chip(host).textContent).toContain("Smart");
    open(host);
    expect(content()).toBeTruthy();
    act(() => void modeRadios()[2].click()); // Manual
    expect(log).toEqual([{ mode: "manual", agent: "offline" }]);
  });
});

describe("the server's first paint", () => {
  it("renders the row without crashing", () => {
    const html = renderToStaticMarkup(
      withProvider(
        createElement(NewChatControls, {
          choice: { mode: "free" },
          setChoice: () => {},
          can: can(),
          engine: "cloud",
          setEngine: () => {},
          askFirst: true,
          setAskFirst: () => {},
        }),
      ),
    );
    expect(html).toContain("Free"); // the chip carries the choice the page has
    expect(html).toContain('data-slot="popover-trigger"');
    expect(html).toContain('data-slot="switch"');
  });
});
