"use client";

import { CalendarClock, Loader2, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EngineSwitch } from "@/components/studio/engine-switch";
import { radioKeys, radioTab } from "@/components/studio/radio-keys";
import { useNow } from "@/components/studio/use-now";
import { useEngine, useStatus } from "@/lib/api";
import { threadTitle, type AssistModeChoice } from "@/lib/assist";
import {
  DEFAULT_SCHEDULE_CAP_USD,
  formatWhen,
  MAX_SCHEDULE_CAP_USD,
  MAX_SCHEDULE_PROMPT,
  nextRun,
  ruleError,
  SCHEDULE_HOURS,
  untilText,
  WEEK_ORDER,
  WEEKDAYS,
  zoneLabel,
  type ScheduleApproval,
  type ScheduleRule,
  type ScheduleView,
} from "@/lib/assist-schedule";
import type { Engine } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/refusals";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useChats, useConnectors, useProjects, useRecipe, useScheduleActions, useSkills, type ScheduleRuleInput } from "./hooks";
import { ModePicker } from "./mode-picker";
import { ProjectDot } from "./project-dot";
import { inputsFrom, SkillTaskFields, skillTask, type SkillInputs } from "./schedule-skill";

/** What a new task starts from: a chat's request, a project, or a skill that runs by itself. */
export interface ScheduleSeed {
  prompt?: string;
  attachments?: string[];
  projectId?: string | null;
  engine?: Engine;
  mode?: AssistModeChoice | null;
  skill?: string;
}

const WHAT = [
  { id: "request", labelKey: "assist.composer.scheduleWhatRequest" },
  { id: "skill", labelKey: "assist.composer.scheduleWhatSkill" },
] as const;

const KINDS: { id: ScheduleRule["kind"]; labelKey: string }[] = [
  { id: "daily", labelKey: "assist.composer.scheduleDaily" },
  { id: "weekly", labelKey: "assist.composer.scheduleWeekly" },
  { id: "hours", labelKey: "assist.composer.scheduleFewHours" },
  { id: "once", labelKey: "assist.composer.scheduleOnce" },
];

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const allZones = (): string[] => {
  try {
    return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
};

/** "2026-10-28T09:00" for tomorrow at 09:00 on this device's clock (the default for "Once"). */
function tomorrowAt9(now: number): string {
  const d = new Date(now + 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T09:00`;
}

/** Create or edit a scheduled task: the prompt, when it runs, where, and whether it asks first. */
export function ScheduleDialog({ open, onOpenChange, schedule, seed }: { open: boolean; onOpenChange: (open: boolean) => void; schedule?: ScheduleView; seed?: ScheduleSeed }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92svh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[600px]">{open && <Form schedule={schedule} seed={seed} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function Form({ schedule, seed, onDone }: { schedule?: ScheduleView; seed?: ScheduleSeed; onDone: () => void }) {
  const { t: tr } = useI18n();
  const actions = useScheduleActions();
  const projects = useProjects();
  const can = useChats({ project: "none" }).data?.availability;
  const [preferred] = useEngine();
  const now = useNow(30_000);
  const ids = { title: useId(), prompt: useId(), time: useId(), at: useId(), hours: useId(), tz: useId(), cap: useId(), project: useId() };
  const initialPrompt = schedule?.prompt ?? seed?.prompt ?? "";
  const [prompt, setPrompt] = useState(initialPrompt);
  const [title, setTitle] = useState(schedule?.title ?? (initialPrompt ? threadTitle(initialPrompt) : ""));
  const [titleTouched, setTitleTouched] = useState(!!schedule);
  const [attachments, setAttachments] = useState<string[]>(schedule?.attachments ?? seed?.attachments ?? []);
  const [projectId, setProjectId] = useState<string | null>(schedule?.projectId ?? seed?.projectId ?? null);
  const r = schedule?.rule;
  const [kind, setKind] = useState<ScheduleRule["kind"]>(r?.kind ?? "daily");
  const [time, setTime] = useState(r && "time" in r ? r.time : "09:00");
  const [days, setDays] = useState<number[]>(r?.kind === "weekly" ? r.days : [1]);
  const [every, setEvery] = useState(r?.kind === "hours" ? r.every : 6);
  const [at, setAt] = useState(r?.kind === "once" ? r.at : () => tomorrowAt9(Date.now()));
  const [tz, setTz] = useState(schedule?.tz ?? browserZone);
  const [approval, setApproval] = useState<ScheduleApproval>(schedule?.approval ?? "ask");
  const [cap, setCap] = useState(String(schedule?.capUsd ?? DEFAULT_SCHEDULE_CAP_USD));
  const [engine, setEngine] = useState<Engine>(schedule?.engine ?? seed?.engine ?? preferred);
  const [mode, setMode] = useState<AssistModeChoice | null>((schedule?.mode as AssistModeChoice | null) ?? seed?.mode ?? null);
  // Off unless the task opts in: connector tools run inside Claude's reply, where no approval reaches them.
  const [connectors, setConnectors] = useState(schedule?.connectors ?? false);
  const connectorNames = (useConnectors().data ?? []).filter((c) => c.enabled).map((c) => c.name);
  // What runs: a request Assist plans each time, or a saved skill's steps with fixed inputs (no model plans it).
  const [what, setWhat] = useState<"request" | "skill">(schedule?.skill || seed?.skill ? "skill" : "request");
  const [skillName, setSkillName] = useState<string | null>(schedule?.skill?.name ?? seed?.skill ?? null);
  const [inputs, setInputs] = useState<SkillInputs>(() => inputsFrom(schedule?.skill));
  const [tried, setTried] = useState(false);
  const allSkills = useSkills().data;
  const runnable = allSkills ? allSkills.filter((s) => s.recipe && s.enabled) : null;
  const recipe = useRecipe(what === "skill" ? skillName : null);
  const skill = what === "skill" && recipe.data && runnable?.some((s) => s.name === recipe.data.name) ? recipe.data : undefined;
  const task = skill ? skillTask(skill, inputs) : null;
  // A skill runs only on the engines its steps run on: the task takes the one it was checked on.
  const runEngine: Engine = skill?.engines.length && !skill.engines.includes(engine) ? (skill.ready.find((e) => skill.engines.includes(e)) ?? skill.engines[0]) : engine;
  const pickSkill = (name: string) => {
    setSkillName(name);
    setInputs(inputsFrom(null));
    setTried(false);
    const picked = runnable?.find((s) => s.name === name)?.title;
    if (!titleTouched && picked) setTitle(picked);
  };
  const [busy, setBusy] = useState(false);
  const zones = useMemo(() => {
    const list = allZones();
    return list.includes(tz) ? list : [tz, ...list];
  }, [tz]);

  const rule: ScheduleRuleInput = kind === "daily" ? { kind, time } : kind === "weekly" ? { kind, days, time } : kind === "hours" ? { kind, every } : { kind, at };
  // An unchanged "every N hours" keeps counting from when it was set up.
  const from = r?.kind === "hours" && r.every === every ? r.from : now;
  const full: ScheduleRule = rule.kind === "hours" ? { ...rule, from } : rule;
  const problem = ruleError(full);
  const next = problem ? null : nextRun(full, tz, now);
  const capUsd = Number(cap);
  const capBad = approval === "auto" && (!cap.trim() || !Number.isFinite(capUsd) || capUsd < 0 || capUsd > MAX_SCHEDULE_CAP_USD);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (what === "request" && !prompt.trim()) return void toast.error(tr("assist.composer.scheduleNeedPrompt"));
    if (what === "skill") {
      setTried(true);
      if (!skill || !task) return void toast.error(tr("assist.composer.schedulePickSkill"));
      if (!task.ok) return void toast.error(task.uploading ? tr("assist.composer.scheduleWaitUpload") : (Object.values(task.errors)[0] ?? tr("assist.composer.scheduleCheckInputs")));
    }
    if (problem) return void toast.error(problem);
    if (!next) return void toast.error(kind === "once" ? tr("assist.composer.scheduleTimePassedShort") : tr("assist.composer.scheduleNeverRuns"));
    if (capBad) return void toast.error(tr("assist.composer.scheduleCapRange", { max: `$${MAX_SCHEDULE_CAP_USD}` }));
    setBusy(true);
    try {
      const when = { projectId, rule, tz, approval, capUsd: approval === "auto" ? capUsd : null };
      // A skill task has no prompt, mode or connectors: no model plans its runs.
      const body =
        skill && task
          ? { ...when, title: title.trim() || skill.title, prompt: "", attachments: [], engine: runEngine, mode: null, connectors: false, skill: task.task }
          : { ...when, title: title.trim() || threadTitle(prompt), prompt: prompt.trim(), attachments, engine, mode, connectors, skill: null };
      const s = schedule ? await actions.update(schedule.id, body) : await actions.create(body);
      toast.success(schedule ? tr("assist.composer.scheduleSaved") : tr("assist.composer.scheduleCreated"), { description: s.nextRunAt ? tr("assist.composer.scheduleNextDesc", { when: formatWhen(s.nextRunAt, s.tz) }) : undefined, duration: 2500 });
      onDone();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  };

  const toggleDay = (d: number) => setDays((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]));
  const onComputer = !!useStatus().data?.ownerGpu;

  return (
    <form onSubmit={save} className="flex min-h-0 flex-col">
      <DialogHeader className="border-b px-5 pt-5 pb-4">
        <DialogTitle className="flex items-center gap-2 font-heading text-[24px] font-normal">
          <CalendarClock className="size-5 text-muted-foreground" /> {schedule ? tr("assist.composer.scheduleEditTitle") : tr("assist.composer.scheduleNewTitle")}
        </DialogTitle>
        <DialogDescription>{tr("assist.composer.scheduleDesc")}</DialogDescription>
        {/* ComfyUI on the owner's computer: its open-source runs wait for a Fuobe tab there. */}
        {onComputer && <p className="text-[13px] text-muted-foreground">{tr("assist.composer.scheduleOnComputer")}</p>}
      </DialogHeader>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{tr("assist.composer.scheduleWhatLegend")}</legend>
          <div role="radiogroup" aria-label={tr("assist.composer.scheduleWhatLegend")} onKeyDown={radioKeys} className="flex flex-wrap gap-1.5">
            {WHAT.map((w) => (
              <button
                key={w.id}
                type="button"
                role="radio"
                aria-checked={what === w.id}
                tabIndex={radioTab(what === w.id)}
                onClick={() => setWhat(w.id)}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium transition-colors",
                  what === w.id ? "bg-brand-faint text-brand-text hover:bg-brand-faint-hover" : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
              >
                {tr(w.labelKey)}
              </button>
            ))}
          </div>
          {what === "skill" && (
            <SkillTaskFields
              skills={runnable}
              name={skillName}
              onName={pickSkill}
              view={skill}
              failed={recipe.isError ? (recipe.error as Error).message : undefined}
              inputs={inputs}
              onInputs={setInputs}
              engine={runEngine}
              onEngine={setEngine}
              tried={tried}
            />
          )}
        </fieldset>

        {what === "request" && (
          <div className="space-y-2">
            <Label htmlFor={ids.prompt}>{tr("assist.composer.schedulePromptLabel")}</Label>
            <Textarea
              id={ids.prompt}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (!titleTouched) setTitle(e.target.value.trim() ? threadTitle(e.target.value) : "");
              }}
              maxLength={MAX_SCHEDULE_PROMPT}
              rows={4}
              autoFocus={!schedule && !initialPrompt}
              placeholder={tr("assist.composer.schedulePromptPlaceholder")}
              className="min-h-24 text-[14px]"
            />
            {attachments.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label={tr("assist.composer.scheduleFilesAria")}>
                {attachments.map((a, i) => (
                  <li key={a} className="inline-flex h-7 items-center gap-1 rounded-full bg-muted pr-1 pl-2.5 text-[12px]">
                    {tr("assist.composer.scheduleFileN", { n: i + 1 })}
                    <button type="button" onClick={() => setAttachments((xs) => xs.filter((x) => x !== a))} className="grid size-5 place-items-center rounded-full hover:bg-background" aria-label={tr("assist.composer.scheduleDontUseFile", { n: i + 1 })}>
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={ids.title}>{tr("assist.composer.scheduleNameLabel")}</Label>
            <Input
              id={ids.title}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              maxLength={80}
              placeholder={tr("assist.composer.scheduleNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.project}>{tr("assist.composer.scheduleProjectLabel")}</Label>
            <Select value={projectId ?? "none"} onValueChange={(v) => setProjectId(v === "none" ? null : v)}>
              <SelectTrigger id={ids.project} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{tr("assist.composer.scheduleNoProject")}</SelectItem>
                {projects.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <ProjectDot project={p} /> {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{tr("assist.composer.scheduleWhenLegend")}</legend>
          <div role="radiogroup" aria-label={tr("assist.composer.scheduleRepeatAria")} onKeyDown={radioKeys} className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={kind === k.id}
                tabIndex={radioTab(kind === k.id)}
                onClick={() => setKind(k.id)}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium transition-colors",
                  kind === k.id ? "bg-brand-faint text-brand-text hover:bg-brand-faint-hover" : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
              >
                {tr(k.labelKey)}
              </button>
            ))}
          </div>
          {kind === "weekly" && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr("assist.composer.scheduleDaysAria")}>
              {WEEK_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days.includes(d)}
                  aria-label={WEEKDAYS[d]}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "grid h-8 w-11 place-items-center rounded-lg border text-[12px] font-medium transition-colors",
                    days.includes(d) ? "border-primary bg-brand-faint text-brand-text" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {WEEKDAYS[d].slice(0, 3)}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            {(kind === "daily" || kind === "weekly") && (
              <div className="space-y-2">
                <Label htmlFor={ids.time}>{tr("assist.composer.scheduleTimeLabel")}</Label>
                <Input id={ids.time} type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
            )}
            {kind === "hours" && (
              <div className="space-y-2">
                <Label htmlFor={ids.hours}>{tr("assist.composer.scheduleEveryLabel")}</Label>
                <Select value={String(every)} onValueChange={(v) => setEvery(Number(v))}>
                  <SelectTrigger id={ids.hours} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h === 1 ? tr("assist.composer.scheduleHourWord") : h % 24 === 0 && h > 24 ? tr("assist.composer.scheduleDaysWord", { h: h / 24 }) : tr("assist.composer.scheduleHoursWord", { h })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {kind === "once" && (
              <div className="space-y-2">
                <Label htmlFor={ids.at}>{tr("assist.composer.scheduleAtLabel")}</Label>
                <Input id={ids.at} type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor={ids.tz}>{tr("assist.composer.scheduleTzLabel")}</Label>
              <Select value={tz} onValueChange={setTz}>
                <SelectTrigger id={ids.tz} className="w-full">
                  <SelectValue>{zoneLabel(tz, now)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {zones.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground" aria-live="polite">
            {problem ? (
              <span className="text-destructive">{problem}</span>
            ) : next ? (
              <>
                {tr("assist.composer.scheduleNextRunPre")}
                <span className="font-medium text-foreground">{formatWhen(next, tz)}</span> ({untilText(next, now)})
                {kind === "hours" && !schedule ? tr("assist.composer.scheduleThenEvery") + (every === 1 ? tr("assist.composer.scheduleHourWord") : tr("assist.composer.scheduleHoursWord", { h: every })) : ""}.
              </>
            ) : (
              <span className="text-destructive">{tr("assist.composer.scheduleTimePassed")}</span>
            )}
          </p>
        </fieldset>

        {what === "request" && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{tr("assist.composer.scheduleAssistantLegend")}</legend>
            <div className="flex flex-wrap items-center gap-1.5">
              <ModePicker value={mode} onChange={setMode} availability={can} />
              <EngineSwitch value={engine} onChange={setEngine} size="sm" compact />
            </div>
            <p className="text-[12px] text-muted-foreground">
              {engine === "open" ? tr("assist.composer.scheduleEngineOpen") : tr("assist.composer.scheduleEnginePaid")}
              {tr("assist.composer.scheduleSmartFreeNote")}
            </p>
          </fieldset>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{tr("assist.composer.scheduleBeforeLegend")}</legend>
          <div role="radiogroup" aria-label={tr("assist.composer.scheduleApprovalAria")} onKeyDown={radioKeys} className="grid gap-2">
            {(
              [
                {
                  id: "ask",
                  titleKey: "assist.composer.scheduleAskTitle",
                  bodyKey:
                    what === "skill"
                      ? "assist.composer.scheduleAskSkillBody"
                      : "assist.composer.scheduleAskRequestBody",
                },
                {
                  id: "auto",
                  titleKey: "assist.composer.scheduleAutoTitle",
                  bodyKey:
                    what === "skill"
                      ? "assist.composer.scheduleAutoSkillBody"
                      : "assist.composer.scheduleAutoRequestBody",
                },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={approval === o.id}
                tabIndex={radioTab(approval === o.id)}
                onClick={() => setApproval(o.id)}
                className={cn("rounded-xl border px-3.5 py-2.5 text-left transition-colors", approval === o.id ? "border-primary bg-brand-faint" : "hover:bg-accent")}
              >
                <span className="block text-[13px] font-medium">{tr(o.titleKey)}</span>
                <span className="block text-[12px] text-muted-foreground">{tr(o.bodyKey)}</span>
              </button>
            ))}
          </div>
          {approval === "auto" && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Label htmlFor={ids.cap} className="text-[13px] font-normal">
                {tr("assist.composer.scheduleSpendUpTo")}
              </Label>
              <div className="relative w-28">
                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[13px] text-muted-foreground">$</span>
                <Input id={ids.cap} type="number" inputMode="decimal" min={0} max={MAX_SCHEDULE_CAP_USD} step={0.5} value={cap} onChange={(e) => setCap(e.target.value)} aria-invalid={capBad} className="pl-6" />
              </div>
              <span className="text-[13px] text-muted-foreground">{tr("assist.composer.schedulePerRunNote")}</span>
            </div>
          )}
        </fieldset>

        {what === "request" && (connectorNames.length > 0 || connectors) && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{tr("assist.composer.scheduleConnectorsLegend")}</legend>
            <label className="flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5">
              <Checkbox checked={connectors} onCheckedChange={(v) => setConnectors(v === true)} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium">
                  {tr("assist.composer.scheduleLetConnectors")}
                  {connectorNames.length ? ` (${connectorNames.join(", ")})` : ""}
                </span>
                <span className="block text-[12px] text-muted-foreground">
                  {tr("assist.composer.scheduleConnectorWarn")}
                </span>
              </span>
            </label>
          </fieldset>
        )}
      </div>
      <DialogFooter className="mx-0 mb-0 border-t px-5 py-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          {tr("common.cancel")}
        </Button>
        <Button type="submit" disabled={busy || (what === "request" ? !prompt.trim() : !skill) || !!problem || !next || capBad}>
          {busy && <Loader2 className="animate-spin" />} {schedule ? tr("common.save") : tr("assist.schedule")}
        </Button>
      </DialogFooter>
    </form>
  );
}
