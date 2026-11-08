"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Download, ExternalLink, Loader2, Lock } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConnectField, type PublicSetting } from "@/components/connect-field";
import { useI18n } from "@/lib/i18n/use-i18n";
import { radioKeys, radioTab } from "@/components/studio/radio-keys";
import { saveSettings } from "@/lib/api";
import { CIVITAI_KEYS_URL, HF_TOKENS_URL } from "@/lib/connections";
import { cn } from "@/lib/utils";
import { responseError, toastError } from "@/lib/refusals";

interface LibraryLora {
  key: string;
  name: string;
  file: string;
  group: "look" | "motion" | "effect" | "adapter";
  base: string;
  /** One half of a Wan 2.2 pair: the high- or low-noise expert's file. */
  target?: "high" | "low";
  page: string;
  download: "direct" | "civitai-token" | "hf-gated";
  licence: string;
  commercial: boolean;
  hostedOk: boolean;
  spare: boolean;
  inFolder: boolean;
  mirrored: string[];
}

interface Library {
  asOf: string;
  folder: string | null;
  /** Why the folder setting can't be read (a file, no permission). */
  folderProblem?: string;
  civitaiKey: boolean;
  /** A Hugging Face token is set: gated files download with it. */
  hfToken?: boolean;
  loras: LibraryLora[];
}

const GROUPS = [
  { value: "look", titleKey: "settings.panel.lora.groupLooks" },
  { value: "motion", titleKey: "settings.panel.lora.groupMotions" },
  { value: "effect", titleKey: "settings.panel.lora.groupEffects" },
  // A recipe's own LoRA (Fuobe Try-On's try-on LoRA): the model loads it on every run.
  { value: "adapter", titleKey: "settings.panel.lora.groupAdapters" },
] as const;

/** The base a LoRA was trained for, in a few words ("wan2.2-i2v-a14b" → "Wan 2.2"). */
function baseName(base: string): string {
  const known: [RegExp, string][] = [
    [/^z-image/, "Z-Image Turbo"],
    [/^wan2\.2/, "Wan 2.2"],
    [/^wan2\.1/, "Wan 2.1"],
    [/^ltx-2\.3/, "LTX-2.3"],
    [/^ltx-2\.5/, "LTX-2.5"],
    [/^ltx-2-/, "LTX-2"],
    [/^qwen-image-edit/, "Qwen-Image-Edit"],
    [/^flux2-klein-4b/, "FLUX.2 [klein] 4B"],
    [/^flux2-klein-9b/, "FLUX.2 [klein] 9B"],
    [/^flux3-klein/, "FLUX 3 Klein"],
  ];
  return known.find(([re]) => re.test(base))?.[1] ?? base;
}

const SOURCE: Record<LibraryLora["download"], string> = {
  direct: "Hugging Face",
  "civitai-token": "civitai · needs your key",
  "hf-gated": "Hugging Face · gated: accept its licence, then your token downloads it",
};

/** The LoRA folder: a plain path field (no connection to test), saved with its own button. */
function FolderField({ setting }: { setting?: PublicSetting }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const id = useId();
  const saved = setting?.value ?? "";
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? saved;
  const changed = draft !== null && draft.trim() !== saved.trim();
  const save = useMutation({
    mutationFn: (value: string) => saveSettings({ comfyLorasDir: value }),
    onSuccess: (_, value) => {
      setDraft(null);
      toast.success(value ? t("settings.panel.lora.folderSaved") : t("settings.panel.lora.folderCleared"));
      void qc.invalidateQueries({ queryKey: ["settings"] });
      void qc.invalidateQueries({ queryKey: ["loras"] });
    },
    onError: (e: Error) => toastError(e),
  });
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} className="text-[13px]">
        {t("settings.panel.lora.folderLabel")}
      </Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={id}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          spellCheck={false}
          value={shown}
          placeholder="/path/to/ComfyUI/models/loras"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && changed) {
              e.preventDefault();
              save.mutate(shown.trim());
            }
          }}
          className="min-w-0 flex-1 basis-56 font-mono text-[13px]"
        />
        <Button size="sm" className="h-9 shrink-0" disabled={!changed || save.isPending} onClick={() => save.mutate(shown.trim())}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {t("common.save")}
        </Button>
      </div>
      <p id={`${id}-hint`} className="text-[12px] text-muted-foreground">
        {setting?.fromEnv ? t("settings.panel.lora.envPrefix") : ""}
        {t("settings.panel.lora.folderHint")}
      </p>
    </div>
  );
}

function LoraRow({ l, folder, onDownload, busy, hfToken }: { l: LibraryLora; folder: boolean; onDownload: () => void; busy: boolean; hfToken: boolean }) {
  const { t } = useI18n();
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <a href={l.page} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-[13px] font-medium hover:underline">
          <span className="truncate">{l.name}</span>
          <ExternalLink className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        </a>
        <p className="flex flex-wrap gap-x-1.5 text-[12px] text-muted-foreground">
          <span>
            {baseName(l.base)}
            {l.target ? t(l.target === "high" ? "settings.panel.lora.targetHighNoise" : "settings.panel.lora.targetLowNoise") : ""}
          </span>
          <span aria-hidden>·</span>
          <span className={cn(l.commercial && !l.hostedOk && "text-foreground")}>{l.licence}</span>
          <span aria-hidden>·</span>
          <span>{SOURCE[l.download]}</span>
          {l.mirrored.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>
                {t("settings.panel.lora.copyOn")}
                {l.mirrored.map((m) => (m === "fal" ? "fal.ai" : "Replicate")).join(t("settings.panel.lora.joinAnd"))}
              </span>
            </>
          )}
        </p>
      </div>
      {l.inFolder ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-success">
          <CheckCircle2 className="size-3.5" /> {t("settings.panel.lora.inFolder")}
        </span>
      ) : l.download === "hf-gated" && !hfToken ? (
        <a
          href="#huggingface"
          className="inline-flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
          title={t("settings.panel.lora.tooltipNeedsToken")}
        >
          <Lock className="size-3.5" /> {t("settings.panel.lora.needsToken")}
        </a>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          className="h-8 shrink-0"
          disabled={!folder || busy}
          title={folder ? undefined : t("settings.panel.lora.folderFirst")}
          aria-label={t("settings.panel.lora.downloadName", { name: l.name })}
          onClick={onDownload}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          <span className="hidden sm:inline">{t("settings.panel.lora.download")}</span>
        </Button>
      )}
    </li>
  );
}

/** Settings → LoRAs: where LoRA files live, the civitai key, and the library with each file's licence. */
export function LoraSettings({ folder, civitaiKey, hfToken }: { folder?: PublicSetting; civitaiKey?: PublicSetting; hfToken?: PublicSetting }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<LibraryLora["group"]>("look");
  const [pending, setPending] = useState<string | null>(null);
  const library = useQuery({
    queryKey: ["loras"],
    queryFn: async () => {
      const res = await fetch("/api/loras");
      const body = (await res.json().catch(() => ({}))) as Partial<Library> & { error?: string };
      if (!res.ok || !Array.isArray(body.loras)) throw new Error(body.error ?? t("settings.panel.lora.serverAnswered", { status: res.status }));
      return body as Library;
    },
  });
  const download = useMutation({
    mutationFn: async (l: LibraryLora) => {
      setPending(l.file);
      const res = await fetch("/api/loras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file: l.file }) });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw responseError(res, body.error ?? t("settings.panel.lora.downloadNotFinished", { status: res.status }));
      return l;
    },
    onSuccess: (l) => toast.success(t("settings.panel.lora.inFolderToast", { name: l.name })),
    onError: (e: Error) => toastError(e),
    onSettled: () => {
      setPending(null);
      void qc.invalidateQueries({ queryKey: ["loras"] });
    },
  });
  const data = library.data;
  const shown = data?.loras.filter((l) => l.group === group) ?? [];
  const inFolder = data?.loras.filter((l) => l.inFolder).length ?? 0;
  // Downloads go into the folder only when it is one this server can write to.
  const canDownload = !!data?.folder && !data.folderProblem;

  return (
    <>
      <FolderField setting={folder} />
      {data?.folderProblem && (
        <p role="alert" className="-mt-2 text-[12px] text-destructive">
          {data.folderProblem}
          {t("settings.panel.lora.problemTail")}
        </p>
      )}
      <ConnectField
        id="civitai"
        name="civitaiKey"
        setting={civitaiKey}
        provider="civitai"
        label={t("settings.panel.lora.civitaiApiKey")}
        placeholder={t("settings.panel.lora.pasteCivitaiKey")}
        hint={
          <span>
            {t("settings.panel.lora.civitaiHint")}{" "}
            <a href={CIVITAI_KEYS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-text hover:underline">
              {t("settings.panel.common.getKey")} <ExternalLink className="size-3" />
            </a>
          </span>
        }
      />
      <ConnectField
        id="huggingface"
        name="huggingfaceDownloadToken"
        setting={hfToken}
        provider="huggingface"
        label={t("settings.panel.lora.hfTokenLabel")}
        placeholder="hf_…"
        hint={
          <span>
            {t("settings.panel.lora.hfHint")}{" "}
            <a href={HF_TOKENS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-text hover:underline">
              {t("settings.panel.lora.makeAToken")} <ExternalLink className="size-3" />
            </a>
          </span>
        }
      />
      <div className="rounded-xl border">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? "lora-library" : undefined}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-accent"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">{t("settings.panel.lora.libraryTitle")}</span>
            <span className="block text-[12px] text-muted-foreground">
              {data ? (
                t("settings.panel.lora.libraryCounts", { count: data.loras.length, inFolder, asOf: data.asOf })
              ) : library.isError ? (
                t("settings.panel.lora.couldntLoadLibrary")
              ) : (
                <span className="mt-1 block h-3.5 w-48 animate-pulse rounded bg-muted" />
              )}
            </span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div id="lora-library" className="border-t px-4 pb-2">
            <div role="radiogroup" aria-label={t("settings.panel.lora.loraKind")} onKeyDown={radioKeys} className="flex gap-1.5 pt-3">
              {GROUPS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  role="radio"
                  aria-checked={group === g.value}
                  tabIndex={radioTab(group === g.value)}
                  onClick={() => setGroup(g.value)}
                  className={cn(
                    "inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-medium transition-colors hover:bg-accent",
                    group === g.value && "border-primary bg-brand-faint hover:bg-brand-faint",
                  )}
                >
                  {t(g.titleKey)}
                  <span className="ml-1 text-muted-foreground">{data?.loras.filter((l) => l.group === g.value).length ?? ""}</span>
                </button>
              ))}
            </div>
            {data && !data.folder && (
              <p className="pt-2 text-[12px] text-muted-foreground">{t("settings.panel.lora.setFolderNote")}</p>
            )}
            <ul className="max-h-96 divide-y overflow-y-auto">
              {shown.map((l) => (
                <LoraRow key={l.key} l={l} folder={canDownload} busy={pending === l.file} hfToken={!!data?.hfToken} onDownload={() => download.mutate(l)} />
              ))}
            </ul>
          </div>
        )}
      </div>
      {library.isError && (
        <p role="alert" className="flex flex-wrap items-center gap-x-2 text-[12px] text-destructive">
          {t("settings.panel.lora.couldntLoadLibraryFull")}
          {(library.error as Error).message}.
          <button type="button" className="font-medium text-foreground underline-offset-2 hover:underline" onClick={() => void library.refetch()}>
            {t("nav.tryAgain")}
          </button>
        </p>
      )}
    </>
  );
}
