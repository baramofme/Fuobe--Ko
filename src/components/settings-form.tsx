"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Cloud, Cpu, ExternalLink, Info, Layers, Link2, Loader2, RefreshCw, Scale } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConnectChoice, OwnerComfyWhere, WorldcastField } from "@/components/gpu/connect-choice";
import { WorkersChip } from "@/components/workers-admin";
import { usePagePlace } from "@/components/gpu/use-local-comfy";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { placeholdersOn } from "@/lib/demo-mode";
import { AccountsChip } from "@/components/accounts-admin";
import { ConnectField, useSettings, type PublicSetting } from "@/components/connect-field";
import { KeyAccountDetails } from "@/components/keys/key-account-details";
import { hashId, keepInView } from "@/components/use-hash-anchor";
import { GetStarted } from "@/components/get-started";
import { AboutLinks } from "@/components/owner-settings";
import { LlmProviderSettings } from "@/components/llm-provider-settings";
import { LoraSettings } from "@/components/lora-settings";
import { useStatus, type StatusInfo } from "@/lib/api";
import { WORKFLOWS_ON_GITHUB } from "@/lib/comfy-install";
import { AI_TOOLKIT_REPO, connectionSummary, DEFAULT_AI_TOOLKIT_URL, ENGINE_MODE_KEYS, FAL_KEYS_URL, showFirstRun } from "@/lib/connections";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { ConnectorSettings } from "@/components/assist/connectors-settings";
import { NotificationSettings } from "@/components/notification-settings";
import { SecuritySettings } from "@/components/security-settings";
import { radioKeys, radioTab } from "@/components/studio/radio-keys";
import { AutoPatternsSetting } from "@/components/auto-patterns-setting";
import { UploadSwitchesSettings } from "@/components/upload-switches-settings";

function Section({
  id,
  title,
  description,
  inactive,
  children,
}: {
  id: string;
  title: string;
  description: React.ReactNode;
  /** Shown when the current engine mode doesn't use this section. */
  inactive?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-28 grid-cols-[minmax(0,1fr)] gap-6 border-b py-8 last:border-b-0 md:scroll-mt-20 md:grid-cols-[260px_minmax(0,1fr)]">
      <div className="min-w-0">
        <h2 id={`${id}-title`} className="group flex items-center gap-1.5 text-[15px] font-semibold">
          {title}
          <a href={`#${id}`} aria-label={t("settings.form.linkToAria", { name: title })} className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
            <Link2 className="size-3.5" />
          </a>
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
        {inactive && <p className="mt-2 inline-flex rounded-md bg-muted px-2 py-1 text-[12px] text-muted-foreground">{inactive}</p>}
      </div>
      <div className={cn("min-w-0 space-y-5", inactive && "opacity-55")}>{children}</div>
    </section>
  );
}

const ENGINE_MODES = [
  {
    value: "both",
    titleKey: "settings.form.engineMode.bothTitle",
    icon: Layers,
    bodyKey: "settings.form.engineMode.bothBody",
    needsKey: "settings.form.engineMode.bothNeeds",
  },
  {
    value: "open",
    titleKey: "settings.form.engineMode.openTitle",
    icon: Cpu,
    bodyKey: "settings.form.engineMode.openBody",
    needsKey: "settings.form.engineMode.openNeeds",
  },
  {
    value: "cloud",
    titleKey: "settings.form.engineMode.cloudTitle",
    icon: Cloud,
    bodyKey: "settings.form.engineMode.cloudBody",
    needsKey: "settings.form.engineMode.cloudNeeds",
  },
] as const;

function EngineModePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("settings.form.engine.groupAria")} className="grid gap-2 lg:grid-cols-3">
      {ENGINE_MODES.map((m) => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            role="radio"
            aria-checked={active}
            onClick={() => !active && onChange(m.value)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors hover:bg-accent",
              active && "border-primary bg-brand-faint hover:bg-brand-faint",
            )}
          >
            <span className="flex items-center gap-2">
              <span className={cn("grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground", active && "bg-primary text-primary-foreground")}>
                <m.icon className="size-4" />
              </span>
              <span className="text-[14px] font-medium">{t(m.titleKey)}</span>
              {active && <CheckCircle2 className="ml-auto size-4 text-brand-text" />}
            </span>
            <span className="text-[13px] leading-relaxed text-muted-foreground">{t(m.bodyKey)}</span>
            <span className="text-[12px] text-muted-foreground">{t("settings.form.engine.needsLine", { needs: t(m.needsKey) })}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * A select whose trigger stays short ("Automatic") at any width; what the picked option does is
 * the line under it, so nothing is cut off.
 */
function ChoiceField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string; hint: string }[];
  onChange: (v: string) => void;
}) {
  const picked = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px]">
        {label}
      </Label>
      <Select value={picked.value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-describedby={`${id}-hint`} className="w-full sm:w-auto sm:min-w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p id={`${id}-hint`} className="text-[12px] text-muted-foreground">
        {picked.hint}
      </p>
    </div>
  );
}

/**
 * What's connected, at a glance and always in view: one chip per connection (green when it works,
 * each a link to its field), the engine mode and, for the owner, the accounts. Also opens the setup guide again.
 */
function StatusStrip({ status, onGuide, guideOpen }: { status?: StatusInfo; onGuide: () => void; guideOpen: boolean }) {
  const place = usePagePlace();
  const { t } = useI18n();
  return (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 border-b bg-background/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 md:top-chrome">
      <nav aria-label={t("settings.form.connectionsAria")} className="scrollbar-none -my-1 flex items-center gap-1.5 overflow-x-auto py-1">
        {status ? (
          <>
            {connectionSummary(status, place).map((c) => (
              <a
                key={c.id}
                href={c.href}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border bg-background px-2.5 text-[12px] whitespace-nowrap transition-colors hover:bg-accent",
                  c.unused && "opacity-60",
                )}
              >
                <span aria-hidden className={cn("size-1.5 rounded-full", c.ok ? "bg-success" : "bg-muted-foreground/50")} />
                <span className="font-medium">{c.label}</span>
                <span className="text-muted-foreground">{c.unused ? t("settings.form.stripNotUsed") : c.text}</span>
              </a>
            ))}
            <a href="#engine" className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 text-[12px] whitespace-nowrap transition-colors hover:bg-accent">
              <span className="text-muted-foreground">{t("settings.form.stripEngineChip")}</span>
              <span className="font-medium">{t(ENGINE_MODE_KEYS[status.engineMode])}</span>
            </a>
            <AccountsChip />
            {!guideOpen && (
              <button type="button" onClick={onGuide} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap text-brand-text hover:bg-brand-faint">
                {t("settings.form.stripSetupGuide")}
              </button>
            )}
          </>
        ) : (
          <Skeleton className="h-7 w-full max-w-xl rounded-full" />
        )}
      </nav>
    </div>
  );
}

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

type LocalKind = "ollama" | "lmstudio" | "unsloth" | "custom";

/** A local LLM server as GET /api/llm reports it (no keys). */
interface LocalServerStatus {
  kind: LocalKind;
  label: string;
  url: string;
  up: boolean;
  auth: "none" | "ok" | "missing" | "rejected";
  models: { id: string; name?: string; loaded?: boolean; context?: number | null; maxContext?: number | null }[];
  model: string | null;
  loaded: boolean | null;
  context: number | null;
  problem: string | null;
  warning: string | null;
  native?: boolean;
}

interface LocalLlmInfo {
  provider: "auto" | LocalKind;
  /** Settings' context, in tokens (0: the server's own). */
  context: number;
  /** The server text steps and Assist use now. */
  active: LocalKind | null;
  servers: LocalServerStatus[];
}

const LOCAL_SERVERS: { value: "auto" | LocalKind; titleKey: string }[] = [
  { value: "auto", titleKey: "settings.form.llm.serverAutomatic" },
  { value: "ollama", titleKey: "settings.form.llm.serverOllama" },
  { value: "lmstudio", titleKey: "settings.form.llm.serverLmStudio" },
  { value: "unsloth", titleKey: "settings.form.llm.serverUnsloth" },
  { value: "custom", titleKey: "settings.form.llm.serverOther" },
];

/** Part of a setup line: a fragment's key, or a command to show in mono. */
type SetupPart = { key: string } | { code: string };

/** Each server's settings and how to get it running. */
const LOCAL_FIELDS: Record<
  LocalKind,
  { url: string; urlPlaceholder: string; urlHintKey: string; model: string; modelPlaceholder?: string; modelHintKey: string; key?: string; keyLabelKey?: string; keyPlaceholder?: string; setup: SetupPart[] }
> = {
  ollama: {
    url: "ollamaUrl",
    urlPlaceholder: "http://127.0.0.1:11434",
    urlHintKey: "settings.form.llm.ollamaUrlHint",
    model: "ollamaModel",
    modelPlaceholder: "qwen3:8b",
    modelHintKey: "settings.form.llm.ollamaModelHint",
    setup: [{ key: "settings.form.llm.setupOllamaPre" }, { code: "ollama pull qwen3:8b" }, { key: "settings.form.llm.setupOllamaPost" }],
  },
  lmstudio: {
    url: "lmstudioUrl",
    urlPlaceholder: "http://127.0.0.1:1234",
    urlHintKey: "settings.form.llm.lmstudioUrlHint",
    model: "lmstudioModel",
    modelHintKey: "settings.form.llm.lmstudioModelHint",
    key: "lmstudioToken",
    keyLabelKey: "settings.form.llm.lmstudioTokenLabel",
    setup: [
      { key: "settings.form.llm.setupLmsPre" },
      { code: "lms server start" },
      { key: "settings.form.llm.setupLmsMid" },
      { code: "lms get qwen/qwen3-8b" },
      { key: "settings.form.llm.setupLmsPost" },
    ],
  },
  unsloth: {
    url: "unslothUrl",
    urlPlaceholder: "http://127.0.0.1:8888",
    urlHintKey: "settings.form.llm.unslothUrlHint",
    model: "unslothModel",
    modelHintKey: "settings.form.llm.unslothModelHint",
    key: "unslothKey",
    keyLabelKey: "settings.form.llm.apiKey",
    keyPlaceholder: "sk-unsloth-…",
    setup: [{ key: "settings.form.llm.setupUnsloth" }],
  },
  custom: {
    url: "llmUrl",
    urlPlaceholder: "http://127.0.0.1:8080/v1",
    urlHintKey: "settings.form.llm.customUrlHint",
    model: "llmModel",
    modelHintKey: "settings.form.llm.customModelHint",
    key: "llmKey",
    keyLabelKey: "settings.form.llm.apiKeyOptional",
    setup: [{ key: "settings.form.llm.setupCustomPre" }, { code: "/v1" }, { key: "settings.form.llm.setupCustomPost" }],
  },
};

const k = (n: number) => `${Math.round(n / 1024)}k`;

/** One line per server: the model it would use, or what's wrong. */
function serverLine(s: LocalServerStatus, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (!s.url) return t("settings.form.llm.notSetUp");
  if (s.problem) return s.up ? s.problem : t("settings.form.llm.notRunningAt", { url: s.url });
  return [
    s.model,
    s.loaded ? t("settings.form.llm.loaded") : s.loaded === false ? t("settings.form.llm.loadsOnFirstUse") : null,
    s.context ? t("settings.form.llm.contextCount", { k: k(s.context) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** A tiny chat call to a local server (POST /api/llm), timed: proves the model answers, not only that the server is up. */
function TryReply({ kind }: { kind: LocalKind }) {
  const { t } = useI18n();
  const [res, setRes] = useState<{ ok: boolean; detail: string } | null>(null);
  const m = useMutation({
    mutationFn: async () =>
      (await (await fetch("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", kind }) })).json()) as { ok: boolean; detail: string },
    onSuccess: setRes,
    onError: (e: Error) => setRes({ ok: false, detail: e.message }),
  });
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setRes(null);
          m.mutate();
        }}
        disabled={m.isPending}
      >
        {m.isPending && <Loader2 className="animate-spin" />} {t("settings.form.llm.sendTest")}
      </Button>
      <span role="status" aria-live="polite" className="min-w-0">
        {res && (
          <span className={cn("inline-flex items-start gap-1 text-[12px] break-words", res.ok ? "text-success" : "text-destructive")}>
            {res.ok ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> : <CircleAlert className="mt-0.5 size-3.5 shrink-0" />}
            {res.detail}
          </span>
        )}
      </span>
    </div>
  );
}

/** Settings → AI helper → the local model server: pick one (or Automatic), see what each one answers, set its URL, model and key, and test it. */
function LocalLlmSettings({ get, set }: { get: (n: string) => PublicSetting | undefined; set: (n: string) => (v: string) => void }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const llm = useQuery({
    queryKey: ["llm"],
    queryFn: async () => (await (await fetch("/api/llm")).json()) as LocalLlmInfo,
    refetchInterval: 30_000,
  });
  const refresh = useMutation({
    mutationFn: async () => (await (await fetch("/api/llm?refresh=1")).json()) as LocalLlmInfo,
    onSuccess: (data) => qc.setQueryData(["llm"], data),
  });
  const reload = useMutation({
    mutationFn: async (model: string | null) =>
      (await (await fetch("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "load", model }) })).json()) as { ok: boolean; detail: string },
    onSuccess: (r) => {
      if (r.ok) toast.success(r.detail);
      else toast.error(r.detail);
      refresh.mutate();
    },
  });
  const provider = (get("llmProvider")?.value || "auto") as "auto" | LocalKind;
  const [picked, setPicked] = useState<LocalKind | null>(null);
  // Pinned: that server's settings. Automatic: the one clicked below, else the one in use.
  const editing: LocalKind = provider !== "auto" ? provider : (picked ?? llm.data?.active ?? "ollama");
  const status = llm.data?.servers.find((s) => s.kind === editing);
  const f = LOCAL_FIELDS[editing];
  const need = llm.data?.context ?? 0;
  // Compared with the model's most when that's less: a reload can't give more than it.
  const maxContext = status?.models.find((m) => m.id === status.model)?.maxContext;
  const want = Math.min(need, maxContext || need);
  const smallContext = editing === "lmstudio" && status?.native && status.loaded && !!status.context && !!want && status.context < want;
  const shown = llm.data?.servers.filter((s) => provider === "auto" || s.kind === provider) ?? [];

  return (
    <div className="min-w-0 space-y-4 rounded-xl border p-4">
      <div className="space-y-1.5">
        <p id="local-llm-label" className="text-[13px] font-medium">
          {t("settings.form.llm.serverLabel")}
        </p>
        <div role="radiogroup" aria-labelledby="local-llm-label" onKeyDown={radioKeys} className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {LOCAL_SERVERS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={provider === o.value}
              tabIndex={radioTab(provider === o.value)}
              onClick={() => provider !== o.value && set("llmProvider")(o.value)}
              className={cn("h-8 rounded-lg px-3 text-[13px] font-medium transition-colors", provider === o.value ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
            >
              {t(o.titleKey)}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-muted-foreground">
          {provider === "auto" ? t("settings.form.llm.autoHint") : t("settings.form.llm.pinnedHint")}
        </p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium">{t("settings.form.llm.foundOnMachine")}</p>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px]" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            {refresh.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />} {t("settings.form.llm.checkAgain")}
          </Button>
        </div>
        {llm.isLoading && <Skeleton className="h-16 w-full rounded-lg" />}
        <ul className="space-y-0.5">
          {shown.map((s) => (
            <li key={s.kind}>
              <button
                type="button"
                onClick={() => setPicked(s.kind)}
                aria-pressed={editing === s.kind}
                className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent", editing === s.kind && "bg-accent")}
              >
                <span className={cn("size-2 shrink-0 rounded-full", !s.problem ? "bg-success" : s.up ? "bg-warning" : "bg-subtle-foreground")} />
                <span className="shrink-0 font-medium">{s.kind === "custom" ? t("settings.form.llm.serverOther") : s.label}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{serverLine(s, t)}</span>
                {llm.data?.active === s.kind && <span className="shrink-0 rounded-md bg-brand-faint px-1.5 py-0.5 text-[11px] text-brand-text">{t("settings.form.llm.inUse")}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4 border-t pt-4">
        <p className="text-[13px] font-medium">{editing === "custom" ? t("settings.form.llm.otherServer") : (status?.label ?? t(LOCAL_SERVERS.find((o) => o.value === editing)!.titleKey))}</p>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {f.setup.map((p, i) => {
            return "key" in p ? <span key={i}>{t(p.key)}</span> : <code key={i} className="font-mono text-[11px]">{p.code}</code>;
          })}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ConnectField key={`${editing}-url`} name={f.url} setting={get(f.url)} provider="llm" label={t("settings.form.llm.urlLabel")} placeholder={f.urlPlaceholder} hint={t(f.urlHintKey)} />
          <ConnectField
            key={`${editing}-model`}
            name={f.model}
            setting={get(f.model)}
            provider="llm"
            label={t("settings.form.llm.modelLabel")}
            placeholder={f.modelPlaceholder}
            hint={t(f.modelHintKey)}
            options={status?.models.map((m) => m.id)}
          />
        </div>
        {f.key && <ConnectField key={`${editing}-key`} name={f.key} setting={get(f.key)} provider="llm" label={t(f.keyLabelKey!)} placeholder={f.keyPlaceholder} hint={t("settings.form.llm.keyHint")} />}
        {status?.problem && status.up && <p className="text-[12px] text-warning">{status.problem}</p>}
        {status?.problem && !status.up && <p className="text-[12px] text-muted-foreground">{status.problem}</p>}
        {status?.warning && !status.problem && <p className="text-[12px] text-warning">{status.warning}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <TryReply key={editing} kind={editing} />
          {smallContext && (
            <Button variant="outline" size="sm" onClick={() => reload.mutate(status?.model ?? null)} disabled={reload.isPending}>
              {reload.isPending && <Loader2 className="animate-spin" />} {t("settings.form.llm.reloadWith", { n: k(want) })}
            </Button>
          )}
        </div>
      </div>

      <ConnectField
        name="llmContext"
        setting={get("llmContext")}
        provider="llm"
        saveOnly
        label={t("settings.form.llm.contextLabel")}
        placeholder="16384"
        hint={t("settings.form.llm.contextHint")}
      />
      <p className="text-[12px] text-muted-foreground">{t("settings.form.llm.sharesGpu")}</p>
    </div>
  );
}

/** The studio's own ComfyUI on the server's machine or network: where it runs, then its address, token and isolated worker. */
function LocalComfy({ get, onWhere }: { get: (n: string) => PublicSetting | undefined; onWhere: (v: "server" | "computer") => Promise<unknown> }) {
  const { t } = useI18n();
  return (
    <>
      <OwnerComfyWhere value={get("comfyWhere")?.value || "server"} onChange={onWhere} />
      {get("comfyWhere")?.value === "workers" && <p className="text-[13px] text-muted-foreground">{t("settings.form.comfy.workersNote")}</p>}
      <WorkersChip />
      <ConnectField name="comfyUrl" setting={get("comfyUrl")} provider="comfyui" label={t("settings.form.comfy.urlLabel")} placeholder="http://127.0.0.1:8188" hint={t("settings.form.comfy.urlHint")} />
      <ConnectField name="comfyToken" setting={get("comfyToken")} provider="comfyui" label={t("settings.form.comfy.tokenLabel")} hint={t("settings.form.comfy.tokenHint")} />
      <ConnectField
        name="comfyIsolatedUrl"
        setting={get("comfyIsolatedUrl")}
        provider="comfyui"
        label={t("settings.form.comfy.isoLabel")}
        placeholder="http://127.0.0.1:8189"
        hint={t("settings.form.comfy.isoHint")}
      />
      <WorldcastField get={get} />
    </>
  );
}

export function SettingsForm({ prices }: { prices?: string }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const settings = useSettings();
  const status = useStatus().data;
  const place = usePagePlace();
  // The setup guide on request: the strip's "Setup guide", or a link to /settings#get-started (Home's demo line).
  const [guide, setGuide] = useState<boolean | null>(null);
  const askedByLink = useSyncExternalStore(subscribeHash, () => window.location.hash === "#get-started", () => false);
  const save = useMutation({
    mutationFn: async (patch: Record<string, string>) =>
      (await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })).json(),
    onSuccess: (body: { error?: string }) => {
      if (body?.error) return toast.error(body.error);
      toast.success(t("settings.form.savedToast"));
      void qc.invalidateQueries({ queryKey: ["settings"] });
      void qc.invalidateQueries({ queryKey: ["status"] });
      void qc.invalidateQueries({ queryKey: ["llm"] });
    },
  });
  const get = (n: string) => settings.data?.find((s) => s.name === n);
  const set = (n: string) => (v: string) => save.mutate({ [n]: v });
  // Deep links (/settings#comfyui) arrive while the form is still a skeleton, so the browser finds
  // no anchor: scroll to it once the sections exist, and keep it there while the page above it settles.
  const loaded = !settings.isLoading;
  useEffect(() => {
    const el = loaded ? document.getElementById(hashId(window.location.hash)) : null;
    return el ? keepInView(el) : undefined;
  }, [loaded]);

  if (settings.isLoading)
    return (
      <div className="space-y-3" aria-busy="true" aria-label={t("settings.form.loadingAria")}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  const mode = get("engineMode")?.value || "both";
  // A hosted studio (this page isn't on the server's machine): the owner's GPU is first the ComfyUI on this computer.
  const hosted = place === "hosted" && mode !== "cloud";
  const onComputer = get("comfyWhere")?.value === "computer";
  // The guide opens by itself on a first run, and on request ("Setup guide") after that.
  const firstRun = showFirstRun(status);
  const guideOpen = !!status && (firstRun || (guide ?? askedByLink));

  return (
    <div>
      <StatusStrip status={status} guideOpen={guideOpen} onGuide={() => setGuide(true)} />
      {guideOpen && status && (
        <div id="get-started" className="scroll-mt-28 pt-6 md:scroll-mt-20">
          <GetStarted
            status={status}
            prices={prices}
            intents={false}
            onHide={() => {
              setGuide(false);
              if (window.location.hash === "#get-started") history.replaceState(null, "", window.location.pathname);
            }}
          />
        </div>
      )}

      <Section
        id="engine"
        title={t("settings.form.engine.title")}
        description={t("settings.form.engine.desc")}
      >
        <EngineModePicker value={mode} onChange={set("engineMode")} />
        <p className="text-[12px] text-muted-foreground">
          {t("settings.form.engine.envPre")}
          <code className="font-mono">FUOBE_ENGINE_MODE</code>
          {t("settings.form.engine.envPost")}
        </p>
      </Section>

      <Section
        id="cloud"
        title={t("settings.form.cloud.title")}
        description={t("settings.form.cloud.desc")}
        inactive={mode === "open" ? t("settings.form.inactiveOpenOnly") : undefined}
      >
        <ConnectField
          id="fal"
          name="falKey"
          setting={get("falKey")}
          provider="fal"
          label={t("settings.form.cloud.falLabel")}
          placeholder="key_id:key_secret"
          hint={
            <a href={FAL_KEYS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-text hover:underline">
              {t("settings.form.cloud.getKey")} <ExternalLink className="size-3" />
            </a>
          }
        >
          {get("falKey")?.isSet && <KeyAccountDetails provider="fal" scope="owner" className="mt-2" />}
        </ConnectField>
        <ConnectField
          id="replicate"
          name="replicateToken"
          setting={get("replicateToken")}
          provider="replicate"
          label={t("settings.form.cloud.replicateLabel")}
          placeholder="r8_…"
          hint={
            <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-text hover:underline">
              {t("settings.form.cloud.getToken")} <ExternalLink className="size-3" />
            </a>
          }
        >
          {get("replicateToken")?.isSet && <KeyAccountDetails provider="replicate" scope="owner" className="mt-2" />}
        </ConnectField>
        <ChoiceField
          id="setting-cloud-provider"
          label={t("settings.form.cloud.providerLabel")}
          value={get("cloudProvider")?.value || "auto"}
          onChange={set("cloudProvider")}
          options={[
            { value: "auto", label: t("settings.form.provider.autoLabel"), hint: t("settings.form.provider.autoHint") },
            { value: "fal", label: t("settings.form.provider.falLabel"), hint: t("settings.form.provider.falHint") },
            { value: "replicate", label: t("settings.form.provider.replicateLabel"), hint: t("settings.form.provider.replicateHint") },
          ]}
        />
      </Section>

      <Section
        id="comfyui"
        title={t("settings.form.comfy.title")}
        description={
          <>
            {hosted ? t("settings.form.comfy.hostedPre") : t("settings.form.comfy.localPre")}
            <a href={WORKFLOWS_ON_GITHUB} target="_blank" rel="noopener" className="text-brand-text underline-offset-2 hover:underline">
              {t("settings.form.comfy.workflowsLink")}
            </a>
            {t("settings.form.comfy.tail")}
          </>
        }
        inactive={mode === "cloud" ? t("settings.form.inactiveCloudOnly") : undefined}
      >
        {hosted ? <ConnectChoice advanced /> : <LocalComfy get={get} onWhere={(v) => save.mutateAsync({ comfyWhere: v })} />}
      </Section>

      <Section
        id="loras"
        title={t("settings.form.loras.title")}
        description={t("settings.form.loras.desc")}
      >
        {onComputer && (
          <p className="flex items-start gap-1.5 text-[13px] text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand-text" /> {t("settings.form.loras.onComputer")}
          </p>
        )}
        <LoraSettings folder={get("comfyLorasDir")} civitaiKey={get("civitaiKey")} hfToken={get("huggingfaceDownloadToken")} />
      </Section>

      <Section
        id="training"
        title={t("settings.form.training.title")}
        description={
          <>
            {t("settings.form.training.pre")}
            <a href={AI_TOOLKIT_REPO} target="_blank" rel="noreferrer" className="text-brand-text underline-offset-2 hover:underline">
              {t("settings.form.training.link")}
            </a>
            {t("settings.form.training.post")}
          </>
        }
        inactive={mode === "cloud" ? t("settings.form.inactiveCloudOnly") : undefined}
      >
        <ConnectField
          name="aiToolkitUrl"
          setting={get("aiToolkitUrl")}
          provider="ai-toolkit"
          label={t("settings.form.training.urlLabel")}
          placeholder={DEFAULT_AI_TOOLKIT_URL}
          hint={t("settings.form.training.urlHint")}
        />
        <ConnectField name="aiToolkitToken" setting={get("aiToolkitToken")} provider="ai-toolkit" label={t("settings.form.training.tokenLabel")} hint={t("settings.form.training.tokenHint")} />
        <ConnectField
          name="aiToolkitDatasetDir"
          setting={get("aiToolkitDatasetDir")}
          provider="ai-toolkit"
          label={t("settings.form.training.dirLabel")}
          placeholder="/mnt/shared/datasets"
          hint={t("settings.form.training.dirHint")}
        />
      </Section>

      <Section
        id="text-ai"
        title={t("settings.form.textAi.title")}
        description={t("settings.form.textAi.desc")}
      >
        <ChoiceField
          id="setting-enhancer"
          label={t("settings.form.textAi.useLabel")}
          // "ollama" is the old name of "local".
          value={(get("enhanceProvider")?.value || "auto").replace(/^ollama$/, "local")}
          onChange={set("enhanceProvider")}
          options={[
            { value: "auto", label: t("settings.form.llm.serverAutomatic"), hint: t("settings.form.enhancer.autoHint") },
            { value: "anthropic", label: t("settings.form.enhancer.claudeLabel"), hint: t("settings.form.enhancer.claudeHint") },
            { value: "local", label: t("settings.form.enhancer.localLabel"), hint: t("settings.form.enhancer.localHint") },
            { value: "none", label: t("settings.form.enhancer.offlineLabel"), hint: t("settings.form.enhancer.offlineHint") },
          ]}
        />
        <ConnectField name="anthropicKey" setting={get("anthropicKey")} provider="llm" label={t("settings.form.textAi.anthropicLabel")} placeholder="sk-ant-…" hint={t("settings.form.textAi.anthropicHint")} />
        <div id="llm-providers" className="scroll-mt-28 md:scroll-mt-20">
          <LlmProviderSettings get={get} set={set} />
        </div>
        <LocalLlmSettings get={get} set={set} />
      </Section>

      <Section
        id="assist-connectors"
        title={t("settings.form.connectors.title")}
        description={t("settings.form.connectors.desc")}
      >
        <ConnectorSettings claudeReady={!!get("anthropicKey")?.isSet} />
      </Section>

      <Section
        id="notifications"
        title={t("settings.form.notifications.title")}
        description={t("settings.form.notifications.desc")}
      >
        <NotificationSettings />
      </Section>

      <Section
        id="security"
        title={t("settings.form.security.title")}
        description={t("settings.form.security.desc")}
      >
        <SecuritySettings />
      </Section>

      <Section
        id="uploads"
        title="Uploads · fit in the browser"
        description="When a file doesn't fit a tool, the visitor's browser can fix it before it is uploaded. Switch a step off if it causes trouble: that kind of file is then refused with the reason, as before, and the server's own checks still apply."
      >
        <UploadSwitchesSettings />
      </Section>

      <Section
        id="demo"
        title={t("settings.form.demo.title")}
        description={t("settings.form.demo.desc")}
      >
        <label htmlFor="setting-demo" className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border bg-background p-4">
          <span className="min-w-0 space-y-1">
            <span className="block text-[14px] font-medium">{t("settings.form.demo.settingName")}</span>
            <span className="block text-[13px] leading-relaxed text-muted-foreground">
              {t("settings.form.demo.body")}
            </span>
          </span>
          <Switch
            id="setting-demo"
            className="mt-0.5"
            checked={placeholdersOn(get("demoMode")?.value)}
            disabled={save.isPending}
            onCheckedChange={(on) => set("demoMode")(on ? "on" : "off")}
          />
        </label>
      </Section>

      <Section
        id="failed-runs"
        title="Failed runs"
        description="What a person reads when a run of theirs on this studio's GPUs can't finish. The details are cleaned first: no folders, addresses, keys or prompt text, and nobody sees another person's."
      >
        <ChoiceField
          id="setting-run-failure-detail"
          label="Show people"
          value={get("runFailureDetail")?.value ?? "full"}
          onChange={set("runFailureDetail")}
          options={[
            { value: "full", label: "Full details", hint: "The plain sentence, and under it what went wrong: ComfyUI's own reason, such as a node that isn't installed or a model file it doesn't have." },
            { value: "friendly", label: "Friendly only", hint: "The plain sentence only. You still read the full reason in each run's details." },
          ]}
        />
      </Section>

      <Section
        id="auto-image"
        title={t("settings.form.autoImage.title")}
        description={t("settings.form.autoImage.desc")}
        inactive={mode === "cloud" ? t("settings.form.inactiveCloudOnly") : undefined}
      >
        <AutoPatternsSetting setting={get("autoImagePatterns")} saving={save.isPending} onSave={set("autoImagePatterns")} />
      </Section>

      <Section
        id="models"
        title={t("settings.about.modelsLicences")}
        description={t("settings.form.models.desc")}
      >
        <Link href="/settings/models" className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-medium transition-colors hover:bg-accent">
          <Scale className="size-4 text-muted-foreground" /> {t("settings.form.models.openLink")}
        </Link>
      </Section>

      <Section id="about" title={t("settings.about.title")} description={t("settings.form.about.desc")}>
        <AboutLinks owner />
      </Section>
    </div>
  );
}
