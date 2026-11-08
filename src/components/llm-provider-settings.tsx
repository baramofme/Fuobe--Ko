"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConnectField, type PublicSetting } from "@/components/connect-field";
import { useI18n } from "@/lib/i18n/use-i18n";
import { t as tr, getLang } from "@/lib/i18n/store";
import { LLM_PROVIDERS, offersFree, type LlmProviderDef, type ProviderGroup } from "@/lib/catalog/llm-providers";
import { cn } from "@/lib/utils";

/** What GET /api/llm says about the hosted providers (no keys). */
interface HostedInfo {
  checked: string;
  smart: string;
  free: string;
  providers: { id: string; status: string; models: { model: string; name: string }[] }[];
}

const GROUPS: { id: ProviderGroup; titleKey: string }[] = [
  { id: "labs", titleKey: "settings.panel.llm.groupBigLabs" },
  { id: "china", titleKey: "settings.panel.llm.groupChina" },
  { id: "hosts", titleKey: "settings.panel.llm.groupHostsAndRouters" },
];

/** Anthropic has its own field above; the local servers have theirs below. */
const ROWS = LLM_PROVIDERS.filter((p) => p.adapter === "openai-chat" || p.adapter === "openai-responses");

const MONTH_KEYS = [
  "settings.panel.llm.monthJanuary",
  "settings.panel.llm.monthFebruary",
  "settings.panel.llm.monthMarch",
  "settings.panel.llm.monthApril",
  "settings.panel.llm.monthMay",
  "settings.panel.llm.monthJune",
  "settings.panel.llm.monthJuly",
  "settings.panel.llm.monthAugust",
  "settings.panel.llm.monthSeptember",
  "settings.panel.llm.monthOctober",
  "settings.panel.llm.monthNovember",
  "settings.panel.llm.monthDecember",
];
const longDay = (iso: string) => {
  const month = Number(iso.slice(5, 7)) - 1;
  const day = Number(iso.slice(8, 10));
  const year = iso.slice(0, 4);
  if (getLang() === "ko") return `${year}년 ${month + 1}월 ${day}일`;
  return `${day} ${tr(MONTH_KEYS[month])} ${year}`;
};

/** "sk-or-…" from "OpenRouter keys start with sk-or-". */
const placeholderOf = (p: LlmProviderDef) => {
  const start = p.keyHint && /start with (\S+?)(?: \(|$)/.exec(p.keyHint.text)?.[1];
  return start ? `${start}…` : tr("settings.panel.llm.pasteTheKey");
};

function ProviderRow({ p, info, get, set }: { p: LlmProviderDef; info?: HostedInfo["providers"][number]; get: (n: string) => PublicSetting | undefined; set: (n: string) => (v: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const keySet = !!(p.keySetting && get(p.keySetting)?.isSet);
  const status = info ? info.status : keySet && p.workspaceSetting ? t("settings.panel.llm.needsWorkspaceId") : keySet ? t("settings.panel.llm.keySet") : t("settings.panel.llm.notSet");
  const tick = p.freePlan?.kind === "plan" && p.freePlan.setting ? p.freePlan.setting : null;
  const region = p.regionSetting && p.regions && p.regions.length > 1 ? p.regionSetting : null;
  const regionValue = region ? get(region)?.value || p.regions![0].id : null;
  const note = p.regions?.find((r) => r.id === regionValue)?.note;
  const tryIt = useMutation({
    mutationFn: async () =>
      (await (await fetch("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "try", provider: p.id }) })).json()) as { ok: boolean; detail: string },
    onSuccess: (r) => (r.ok ? toast.success(r.detail) : toast.error(r.detail)),
  });
  const bodyId = `llm-${p.id}-body`;

  return (
    <li id={`llm-${p.id}`} className="scroll-mt-28 md:scroll-mt-20">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent"
      >
        <span className={cn("size-2 shrink-0 rounded-full", info ? (status === "Key rejected" ? "bg-warning" : "bg-success") : "bg-subtle-foreground")} />
        <span className="min-w-0 flex-1 truncate font-medium">{p.label}</span>
        {offersFree(p) && <span className="shrink-0 rounded-md bg-brand-faint px-1.5 py-0.5 text-[11px] text-brand-text">{t("settings.panel.llm.freeBadge")}</span>}
        <span className="shrink-0 text-[12px] text-muted-foreground">{status}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div id={bodyId} className="mt-1 mb-3 space-y-4 rounded-lg border p-3">
          {p.keySetting && (
            <ConnectField
              name={p.keySetting}
              setting={get(p.keySetting)}
              provider="llm"
              label={t("settings.panel.llm.apiKeyFor", { name: p.label })}
              placeholder={placeholderOf(p)}
              hint={p.modelsPath || p.id === "openrouter" ? t("settings.panel.llm.hintFreeCall") : t("settings.panel.llm.hintTinyMessage")}
            />
          )}
          {p.workspaceSetting && (
            <ConnectField
              name={p.workspaceSetting}
              setting={get(p.workspaceSetting)}
              provider="llm"
              label={t("settings.panel.llm.workspaceId")}
              placeholder="ws-…"
              hint={t("settings.panel.llm.workspaceHint")}
            />
          )}
          {region && p.regions && (
            <div className="space-y-1.5">
              <Label htmlFor={`${p.id}-region`} className="text-[13px]">
                {t("settings.panel.llm.region")}
              </Label>
              <Select value={regionValue ?? undefined} onValueChange={set(region)}>
                <SelectTrigger id={`${p.id}-region`} className="w-full sm:w-auto sm:min-w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {p.regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {note && <p className="text-[12px] text-muted-foreground">{note}</p>}
            </div>
          )}
          {tick && p.freePlan && (
            <label className="flex items-start gap-2 text-[13px]">
              <input type="checkbox" className="mt-0.5" checked={get(tick)?.value === "1"} onChange={(e) => set(tick)(e.target.checked ? "1" : "0")} />
              <span>
                {t("settings.panel.llm.myKeyOnFreePlan", { name: p.short })}
                <span className="block text-[12px] text-muted-foreground">
                  {p.freePlan.limits}.{p.freePlan.caveat ? ` ${p.freePlan.caveat}` : ""}
                  {p.freePlan.tooSmall ? ` ${p.freePlan.tooSmall}.` : ` ${t("settings.panel.llm.freeThenModelsOnly")}`}
                </span>
              </span>
            </label>
          )}
          {p.freeLimits && (
            <p className="text-[12px] text-muted-foreground">
              {t("settings.panel.llm.freeModelsPrefix")}
              {p.freeLimits.text}.{p.freeLimits.caveat ? ` ${p.freeLimits.caveat}` : ""}
            </p>
          )}
          {p.freePlan?.kind === "trial" && (
            <p className="text-[12px] text-muted-foreground">
              {t("settings.panel.llm.trialPrefix")}
              {p.freePlan.limits}
              {t("settings.panel.llm.trialSuffix")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {p.keysUrl && (
              <Button asChild variant="outline" size="sm" className="h-8 text-[12px]">
                <a href={p.keysUrl} target="_blank" rel="noreferrer">
                  {t("settings.panel.common.getKey")} <ExternalLink />
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-[12px]" disabled={!info || tryIt.isPending} onClick={() => tryIt.mutate()}>
              {tryIt.isPending && <Loader2 className="animate-spin" />} {t("settings.panel.llm.tryAReply")}
            </Button>
            <span className="text-[11px] text-muted-foreground">{t("settings.panel.llm.tryHint")}</span>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Settings → AI helper: the hosted providers Assist can plan with (src/lib/catalog/llm-providers.ts), one row
 * each, and the two choices Smart and Free make. Keys stay on the server: rows show "Key set", never a key.
 */
export function LlmProviderSettings({ get, set }: { get: (n: string) => PublicSetting | undefined; set: (n: string) => (v: string) => void }) {
  const { t } = useI18n();
  const llm = useQuery({
    queryKey: ["llm"],
    queryFn: async () => (await (await fetch("/api/llm")).json()) as { hosted?: HostedInfo },
    refetchInterval: 30_000,
  });
  const hosted = llm.data?.hosted;
  const plan = get("smartPlan")?.value || "auto";
  const options = [
    { value: "auto", label: t("settings.panel.llm.automaticBest") },
    ...(hosted?.providers ?? []).flatMap((g) => g.models.map((m) => ({ value: `${g.id}|${m.model}`, label: `${m.name} · ${LLM_PROVIDERS.find((p) => p.id === g.id)?.short ?? g.id}` }))),
  ];

  return (
    <div className="min-w-0 space-y-4 rounded-xl border p-4">
      <div className="space-y-1">
        <p className="text-[13px] font-medium">{t("settings.panel.llm.providersForAssist")}</p>
        <p className="text-[12px] leading-relaxed text-muted-foreground">{t("settings.panel.llm.addKeyBlurb")}</p>
      </div>
      {GROUPS.map((g) => (
        <div key={g.id} className="space-y-1">
          <p className="px-2 text-[12px] font-medium text-muted-foreground">{t(g.titleKey)}</p>
          <ul className="space-y-0.5">
            {ROWS.filter((p) => p.group === g.id).map((p) => (
              <ProviderRow key={p.id} p={p} info={hosted?.providers.find((x) => x.id === p.id)} get={get} set={set} />
            ))}
          </ul>
        </div>
      ))}
      <div className="space-y-4 border-t pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="setting-smart-plan" className="text-[13px]">
            {t("settings.panel.llm.smartPlansWith")}
          </Label>
          <Select value={options.some((o) => o.value === plan) ? plan : "auto"} onValueChange={set("smartPlan")}>
            <SelectTrigger id="setting-smart-plan" className="w-full sm:w-auto sm:min-w-56">
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
          {hosted && <p className="text-[12px] text-muted-foreground">{hosted.smart}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setting-free-order" className="text-[13px]">
            {t("settings.panel.llm.freeUses")}
          </Label>
          <Select value={get("freeOrder")?.value === "local" ? "local" : "best"} onValueChange={set("freeOrder")}>
            <SelectTrigger id="setting-free-order" className="w-full sm:w-auto sm:min-w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="best">{t("settings.panel.llm.bestFreeModel")}</SelectItem>
              <SelectItem value="local">{t("settings.panel.llm.localModelFirst")}</SelectItem>
            </SelectContent>
          </Select>
          {hosted && <p className="text-[12px] text-muted-foreground">{hosted.free}</p>}
        </div>
        {hosted && <p className="text-[11px] text-muted-foreground">{t("settings.panel.llm.modelListChecked", { date: longDay(hosted.checked) })}</p>}
      </div>
    </div>
  );
}
