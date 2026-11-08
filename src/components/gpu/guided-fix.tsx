"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Circle, Cpu, Download, Layers, Loader2, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CommandTabs } from "@/components/gpu/command-block";
import { FileStepRows } from "@/components/gpu/file-steps";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { GPU_SETUP_EVENT, takeGpuRetry, useGpuCheck, useGpuPlan, type GpuSetupDetail } from "@/hooks/use-gpu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEngine } from "@/lib/api";
import { knownFixes } from "@/lib/gpu/known-problems";
import { formatBytes } from "@/lib/gpu/requirements";
import type { FixPlan, FixStep, Need, WhyCode } from "@/lib/gpu/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/use-i18n";
import { translateOr } from "@/lib/i18n/store";

/**
 * The guided fix (UX §7): a tool's plan where the user is stuck — on Generate, on a chip, on a board row, on a
 * failed run. P1 sets nothing up by itself: state A shows what the tool needs and the exact commands (Windows and
 * Mac / Linux), E says why it's by hand, F is "needs a bigger GPU", and once a check finds it all, D offers "Try
 * again" with the prompt still in the box. The sheet opens with focus on its title, so Enter can't run anything.
 */

const DOWNLOAD_KINDS = new Set<Need["kind"]>(["model", "model-replace", "lora"]);

/** One plain sentence: why this is by hand. */
const WHY: Partial<Record<WhyCode, string>> = {
  "no-manager": "settings.gpu.guidedFix.noManager",
  "manual-only": "settings.gpu.guidedFix.manualOnly",
};

const VERB_KEY: Record<string, string> = { image: "settings.gpu.guidedFix.verbDraw", video: "settings.gpu.guidedFix.verbAnimate", audio: "settings.gpu.guidedFix.verbSpeak", text: "settings.gpu.guidedFix.verbListen", model3d: "settings.gpu.guidedFix.verbBuild" };

function itemLine(n: Need): string {
  if (n.kind === "model-replace") return "settings.gpu.guidedFix.itemDownloadAgain";
  if (DOWNLOAD_KINDS.has(n.kind)) return "settings.gpu.guidedFix.itemDownload";
  if (n.kind === "pack-install") return "settings.gpu.guidedFix.itemInstall";
  if (n.kind === "pack-update") return "settings.gpu.guidedFix.itemUpdate";
  if (n.kind === "pack-repair") return "settings.gpu.guidedFix.itemRepair";
  if (n.kind === "comfy-update") return "settings.gpu.guidedFix.itemUpdate";
  return "settings.gpu.guidedFix.itemDo";
}

function intro(plan: FixPlan, kind: string | undefined, t: (key: string, params?: Record<string, string | number>) => string): React.ReactNode {
  // A known problem of this ComfyUI on this system says what stops, and why, in its own words.
  const known = plan.steps.find((s) => s.problem);
  if (known) return known.detail;
  const downloads = plan.steps.filter((s) => DOWNLOAD_KINDS.has(s.kind));
  const packs = plan.steps.filter((s) => s.kind.startsWith("pack-"));
  if (plan.steps.some((s) => s.kind === "comfy-update")) return t("settings.gpu.guidedFix.comfyUpdateOlder");
  if (plan.steps.some((s) => s.kind === "core-missing")) return t("settings.gpu.guidedFix.introCoreMissing");
  if (downloads.length && !packs.length)
    return (
      <>
        {t("settings.gpu.guidedFix.introModelPre")}
        {kind && VERB_KEY[kind] ? t(VERB_KEY[kind]) : t("settings.gpu.guidedFix.verbMakeThings")}
        {t("settings.gpu.guidedFix.introModelPost")}
      </>
    );
  if (packs.length && !downloads.length)
    return (
      <>
        {plan.name}
        {t("settings.gpu.guidedFix.introPackPre")}
      </>
    );
  return t("settings.gpu.guidedFix.introGeneric");
}

function StepRow({ n, done }: { n: Need; done?: boolean }) {
  const { t } = useI18n();
  return (
    <li className="flex items-start gap-2.5 py-1.5 text-[13px]">
      {done ? <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <Circle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1">{n.label}</span>
      {n.sizeBytes ? <span className="shrink-0 tabular-nums text-muted-foreground">{formatBytes(n.sizeBytes)}</span> : null}
      <span className="w-28 shrink-0 text-right text-[12px] text-muted-foreground">{done ? t("settings.gpu.guidedFix.alreadyThere") : t(itemLine(n))}</span>
    </li>
  );
}

function Details({ steps }: { steps: FixStep[] }) {
  const { t } = useI18n();
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ChevronRight aria-hidden className="size-3.5 transition-transform group-data-[state=open]:rotate-90" /> {t("settings.gpu.guidedFix.details")}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 space-y-2 text-[12px] text-muted-foreground">
          {steps.map((s) => (
            <li key={s.id} className="break-words">
              <span className="text-foreground">{s.label}</span>: {s.detail}
              {s.link && (
                <>
                  {" "}
                  <a href={s.link} target="_blank" rel="noreferrer" className="text-brand-text underline underline-offset-2">
                    {t("settings.gpu.guidedFix.openPage")}
                  </a>
                </>
              )}
              {/* Text from the viewer's ComfyUI (a traceback): plain text only. */}
              {s.remote && <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted p-2 font-mono text-[11px] whitespace-pre-wrap">{s.remote}</pre>}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** The studio's cloud engine (the owner's only: accounts never run on the studio's keys, so plans never offer it to them). */
function UseCloud({ close, variant }: { close: () => void; variant?: "secondary" }) {
  const [, setEngine] = useEngine();
  const { t } = useI18n();
  return (
    <Button variant={variant} className="h-11 sm:h-9" onClick={() => (setEngine("cloud"), close())}>
      {t("settings.gpu.guidedFix.useCloud")}
    </Button>
  );
}

interface Actions {
  retry?: () => void;
  skip?: () => void;
  close: () => void;
}

function PlanState({ plan, kind, actions, checking, onCheck, checkError }: { plan: FixPlan; kind?: string; actions: Actions; checking: boolean; onCheck: () => void; checkError: string | null }) {
  const { t } = useI18n();
  const real = plan.steps.filter((s) => s.kind !== "restart" && s.kind !== "hf-licence" && s.kind !== "civitai-key");
  // Files get rows of their own (name, size, folder, Get it); the list keeps the other steps and what is already there.
  const files = real.filter((s) => s.download);
  // A known problem's fixes, recommended first, each with an example.
  const fixes = knownFixes(plan.steps.find((s) => s.problem)?.problem);
  const shown = files.length ? real.filter((s) => !s.download) : real.length ? real : plan.steps;
  const why = WHY[plan.why] ?? WHY["manual-only"]!;
  const [lo, hi] = plan.etaMin;
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">{intro(plan, kind, t)}</p>
      {fixes.length > 0 && (
        <ol className="space-y-2 rounded-lg border px-3 py-2.5 text-[13px]">
          {fixes.map((f, i) => (
            <li key={f.label}>
              <p className={cn(i === 0 && "font-medium")}>{f.label}</p>
              {f.example && <p className="mt-0.5 font-mono text-[12px] break-all text-muted-foreground">{f.example}</p>}
            </li>
          ))}
        </ol>
      )}
      {files.length > 0 && <FileStepRows plan={plan} />}
      {(shown.length > 0 || plan.have.length > 0) && (
        <ul className="divide-y rounded-lg border px-3">
          {shown.map((s) => (
            <StepRow key={s.id} n={s} />
          ))}
          {plan.have.slice(0, 6).map((h) => (
            <StepRow key={h.key} n={h} done />
          ))}
        </ul>
      )}
      {plan.downloadBytes > 0 && (
        <p className="text-[13px]">
          {t("settings.gpu.guidedFix.hfSizePre", { bytes: formatBytes(plan.downloadBytes) })}
          {lo === hi ? lo : `${lo}–${hi}`}
          {t("settings.gpu.guidedFix.hfSizeMid")}{" "}
          <span className="text-muted-foreground">{t("settings.gpu.guidedFix.hfFreeSpace", { bytes: formatBytes(plan.downloadBytes) })}</span>
        </p>
      )}
      {plan.restart && <p className="text-[13px] text-muted-foreground">{t("settings.gpu.guidedFix.restartNote")}</p>}
      {plan.firstRun.length > 0 && <p className="text-[13px] text-muted-foreground">{t("settings.gpu.guidedFix.firstRunNote")}</p>}
      {plan.unobservable.length > 0 && (
        <p className="text-[13px] text-muted-foreground">
          {t("settings.gpu.guidedFix.unobservablePre")}
          {plan.unobservable.length === 1 ? t("settings.gpu.guidedFix.unobservableOne") : t("settings.gpu.guidedFix.unobservableMany", { count: plan.unobservable.length })}
          {t("settings.gpu.guidedFix.unobservablePost")}
        </p>
      )}
      <Details steps={plan.steps} />
      <div className="space-y-2 border-t pt-4">
        <h3 className="text-[14px] font-semibold">{t("settings.gpu.guidedFix.byHand")}</h3>
        <p className="text-[13px] text-muted-foreground">{t(why)}</p>
        <CommandTabs bash={plan.commands.bash} powershell={plan.commands.powershell} windowsFirst={plan.os ? plan.os === "nt" : undefined} />
      </div>
      {checkError && <p className="text-[12px] text-destructive">{checkError}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button onClick={onCheck} disabled={checking} className="h-11 sm:h-9">
          {checking ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {t("settings.gpu.guidedFix.doneCheck")}
        </Button>
        {plan.alternatives.cloud && <UseCloud close={actions.close} variant="secondary" />}
        {actions.skip && (
          <Button variant="ghost" className="h-11 text-muted-foreground sm:h-9" onClick={() => (actions.close(), actions.skip!())}>
            {t("settings.gpu.guidedFix.runAnyway")}
          </Button>
        )}
      </div>
    </div>
  );
}

function GpuState({ plan, actions }: { plan: FixPlan; actions: Actions }) {
  const { t } = useI18n();
  const { needGb, haveGb, fit } = plan.vram;
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        {t("settings.gpu.guidedFix.gpuUsesPre", { name: plan.name })}
        {needGb}
        {t("settings.gpu.guidedFix.gpuUsesMid")}{" "}
        {haveGb ? t("settings.gpu.guidedFix.gpuHasGpu", { gpu: plan.gpu ?? t("settings.gpu.guidedFix.graphicsCard"), have: haveGb }) : t("settings.gpu.guidedFix.gpuNotFound")}
      </p>
      {plan.alternatives.fits?.length ? (
        <div className="space-y-1">
          <p className="text-[13px] font-medium">{t("settings.gpu.guidedFix.fitsYourGpu")}</p>
          <ul className="text-[13px] text-muted-foreground">
            {plan.alternatives.fits.map((f) => (
              <li key={f.ref} className="flex items-center gap-2">
                <CheckCircle2 aria-hidden className={cn("size-3.5", f.state === "ready" ? "text-success" : "text-warning")} />
                {f.name} · {f.state === "ready" ? t("settings.gpu.connectChoice.readyWord") : t("settings.gpu.guidedFix.oneStepAway")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {plan.alternatives.cloud && <UseCloud close={actions.close} />}
        {actions.skip && (
          <Button variant={plan.alternatives.cloud ? "ghost" : "secondary"} className="h-11 sm:h-9" onClick={() => (actions.close(), actions.skip!())}>
            {t("settings.gpu.guidedFix.tryAnyway")}
          </Button>
        )}
        <Button variant="ghost" className="h-11 sm:h-9" onClick={actions.close}>
          {t("common.close")}
        </Button>
      </div>
      {actions.skip && <p className="text-[12px] text-muted-foreground">{fit === "tight" ? t("settings.gpu.guidedFix.fitTight") : t("settings.gpu.guidedFix.fitSlow")}</p>}
    </div>
  );
}

function titleOf(plan: FixPlan | undefined, name: string): { text: string; Icon: typeof Download; params?: Record<string, string | number> } {
  if (!plan) return { text: name, Icon: Wrench };
  if (plan.state === "ready") return { text: "settings.gpu.guidedFix.titleReady", Icon: CheckCircle2, params: { name: plan.name } };
  if (plan.state === "gpu") return { text: "settings.gpu.guidedFix.titleBiggerGpu", Icon: Cpu, params: { name: plan.name } };
  if (plan.state === "unsupported" && plan.gpuNeed)
    return { text: plan.gpuNeed === "nvidia-rtx-40" ? "settings.gpu.guidedFix.titleRtx40" : "settings.gpu.guidedFix.titleRtx", Icon: Cpu, params: { name: plan.name } };
  if (plan.state === "unsupported") return { text: "settings.gpu.guidedFix.titleSecondComfy", Icon: Layers, params: { name: plan.name } };
  const n = plan.steps.filter((s) => s.kind !== "restart" && s.kind !== "hf-licence" && s.kind !== "civitai-key").length || 1;
  return { text: n === 1 ? "settings.gpu.guidedFix.titleOneMore" : "settings.gpu.guidedFix.titleMany", Icon: Download, params: { name: plan.name, n } };
}

function Body({ detail, actions, titleRef }: { detail: GpuSetupDetail; actions: Actions; titleRef: React.RefObject<HTMLHeadingElement | null> }) {
  const qc = useQueryClient();
  const q = useGpuPlan(detail.ref);
  const check = useGpuCheck();
  const [checked, setChecked] = useState(false);
  // A plan handed over with the event shows at once; the query refreshes it.
  const plan = q.data ?? (q.isFetching || !checked ? detail.plan : undefined);
  const mobile = useIsMobile();
  const { t, lang } = useI18n();
  const { text, Icon, params } = titleOf(plan, detail.name ?? plan?.name ?? t("settings.gpu.guidedFix.setDefaultTool"));
  const recheck = async () => {
    await check.start();
    setChecked(true);
    await qc.invalidateQueries({ queryKey: ["gpu", "plan", detail.ref] });
  };
  const T = mobile ? SheetTitle : DialogTitle;
  const D = mobile ? SheetDescription : DialogDescription;
  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4">
      <div className="flex items-start gap-3 pr-8">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", plan?.state === "ready" ? "bg-success/15 text-success" : "bg-brand-faint text-brand-text")}>
          <Icon aria-hidden className="size-4.5" />
        </span>
        <div className="min-w-0">
          <T ref={titleRef} tabIndex={-1} className="font-sans text-[16px] font-semibold outline-none">
            {translateOr(lang, text, text, params)}
          </T>
          <D className="text-[12px] text-muted-foreground">{plan?.gpu ? t("settings.gpu.guidedFix.onGpu", { gpu: plan.gpu }) : t("settings.gpu.guidedFix.onComfy")}</D>
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {check.running ? t("settings.gpu.guidedFix.checkingGpu") : plan ? translateOr(lang, text, text, params) : ""}
      </div>
      {!plan && (q.isLoading || q.isFetching) && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      {!plan && q.isError && (
        <div className="space-y-3 text-[13px]">
          <p className="text-muted-foreground">{(q.error as Error).message}</p>
          <Button asChild className="h-11 sm:h-9">
            <Link href="/connect" onClick={actions.close}>
              {t("settings.gpu.guidedFix.checkGpuLink")}
            </Link>
          </Button>
        </div>
      )}
      {plan?.state === "ready" && (
        <div className="space-y-4">
          <p className="animate-pop-in text-[13px] text-muted-foreground">{actions.retry ? t("settings.gpu.guidedFix.promptStill") : t("settings.gpu.guidedFix.everythingThere")}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {actions.retry ? (
              <Button className="h-11 sm:h-9" onClick={() => (actions.close(), actions.retry!())}>
                {t("settings.gpu.guidedFix.tryAgain")}
              </Button>
            ) : (
              <Button className="h-11 sm:h-9" onClick={actions.close}>
                {t("settings.gpu.guidedFix.doneBtn")}
              </Button>
            )}
            <Button asChild variant="ghost" className="h-11 sm:h-9">
              <Link href="/connect" onClick={actions.close}>
                {t("settings.gpu.guidedFix.backToBoard")}
              </Link>
            </Button>
          </div>
        </div>
      )}
      {plan?.state === "gpu" && <GpuState plan={plan} actions={actions} />}
      {plan?.state === "unsupported" && (
        <div className="space-y-3 text-[13px] text-muted-foreground">
          <p>
            {plan.gpuNeed ? (
              <>
                {t(plan.gpuNeed === "nvidia-rtx-40" ? "settings.gpu.guidedFix.unsupportedRtx40" : "settings.gpu.guidedFix.unsupportedRtx")}
                {plan.gpu ? t("settings.gpu.guidedFix.unsupportedAndYours", { gpu: plan.gpu }) : ""}
                {t("settings.gpu.guidedFix.unsupportedPick")}
              </>
            ) : (
              t("settings.gpu.guidedFix.unsupportedNeed")
            )}
          </p>
          <Button variant="secondary" className="h-11 sm:h-9" onClick={actions.close}>
            {t("common.close")}
          </Button>
        </div>
      )}
      {plan && (plan.state === "almost" || plan.state === "setup") && (
        <PlanState plan={plan} kind={undefined} actions={actions} checking={check.running} onCheck={() => void recheck()} checkError={check.error} />
      )}
      {plan?.state === "unknown" && (
        <div className="space-y-3 text-[13px] text-muted-foreground">
          <p>{t("settings.gpu.guidedFix.couldntCheck")}</p>
          <Button className="h-11 sm:h-9" disabled={check.running} onClick={() => void recheck()}>
            {check.running && <Loader2 className="animate-spin" />} {t("settings.gpu.yourGpu.checkAgainAction")}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Mounted once (Providers): opens on the "fuobe:gpu-setup" event, a Dialog on desktop and a bottom Sheet on phones. */
export function GuidedFixHost() {
  const [detail, setDetail] = useState<GpuSetupDetail | null>(null);
  const [actions, setActions] = useState<{ retry?: () => void; skip?: () => void }>({});
  const opener = useRef<Element | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const mobile = useIsMobile();
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<GpuSetupDetail>).detail;
      if (!d?.ref) return;
      opener.current = document.activeElement;
      const r = takeGpuRetry();
      setActions(r ? { retry: r.retry, skip: r.skip } : {});
      setDetail((cur) => (cur && cur.ref === d.ref ? { ...cur, ...d } : d));
    };
    window.addEventListener(GPU_SETUP_EVENT, on);
    return () => window.removeEventListener(GPU_SETUP_EVENT, on);
  }, []);
  const close = () => setDetail(null);
  const focusTitle = (e: Event) => {
    e.preventDefault();
    titleRef.current?.focus();
  };
  const restore = (e: Event) => {
    e.preventDefault();
    (opener.current as HTMLElement | null)?.focus?.();
  };
  const body = detail && <Body key={detail.ref} detail={detail} actions={{ ...actions, close }} titleRef={titleRef} />;
  if (mobile)
    return (
      <Sheet open={!!detail} onOpenChange={(o) => !o && close()}>
        <SheetContent side="bottom" onOpenAutoFocus={focusTitle} onCloseAutoFocus={restore} className="max-h-[85svh] gap-0 overflow-y-auto rounded-t-2xl px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          {body}
        </SheetContent>
      </Sheet>
    );
  return (
    <Dialog open={!!detail} onOpenChange={(o) => !o && close()}>
      <DialogContent onOpenAutoFocus={focusTitle} onCloseAutoFocus={restore} className="max-h-[90svh] grid-cols-[minmax(0,1fr)] overflow-y-auto rounded-[var(--radius-sheet,1rem)] sm:max-w-[560px]">
        {body}
      </DialogContent>
    </Dialog>
  );
}
