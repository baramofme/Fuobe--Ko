"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Cpu, KeyRound, Loader2, Puzzle, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { gib } from "@/components/gpu/comfy-finder";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copyWithToast } from "@/lib/clipboard";
import { useI18n } from "@/lib/i18n/use-i18n";
import { FUOBE_CONNECT, pairCode, pairedOnline, trustedByDefault, type PairedComfy } from "@/lib/fuobe-connect";
import { deviceLabel } from "@/lib/gpu/readiness";
import { cn } from "@/lib/utils";

/**
 * Fuobe Connect on this site's screens: the one step to install it, approving a pairing code, and the ComfyUIs paired
 * with this person.
 */

const origin = () => (typeof window === "undefined" ? "https://fuobe.com" : window.location.origin);

function Copyable({ text, label }: { text: string; label: string }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted py-0.5 pr-0.5 pl-2 align-middle">
      <code aria-label={label} className="min-w-0 overflow-x-auto font-mono text-[12px] whitespace-nowrap">
        {text}
      </code>
      <button type="button" onClick={() => void copyWithToast(text)} aria-label={t("settings.gpu.fuobeConnect.copyAria", { label })} className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-background hover:text-foreground">
        <Copy className="size-3" />
      </button>
    </span>
  );
}

/**
 * "Install Fuobe Connect in ComfyUI-Manager": the search term to type, the git address for the other ways, and, on a
 * studio Fuobe Connect doesn't trust by itself, the address to add in its setting.
 */
export function InstallConnect({ className, then }: { className?: string; then?: string }) {
  const { t } = useI18n();
  const own = !trustedByDefault(origin());
  return (
    <div className={cn("space-y-2 rounded-xl border bg-background p-3", className)}>
      <p className="flex items-center gap-2 text-[14px] font-medium">
        <Puzzle aria-hidden className="size-4 shrink-0 text-brand-text" /> {t("settings.gpu.fuobeConnect.installTitle", { name: FUOBE_CONNECT.name })}
      </p>
      <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-muted-foreground">
        <li>
          {t("settings.gpu.fuobeConnect.step1Pre")}<span className="text-foreground">Manager → Custom Nodes Manager</span>{t("settings.gpu.fuobeConnect.step1Mid")}<Copyable text={FUOBE_CONNECT.search} label={t("settings.gpu.fuobeConnect.searchTermLabel")} />
        </li>
        <li>
          {t("settings.gpu.fuobeConnect.step2Pre")}<span className="text-foreground">Install</span>{t("settings.gpu.fuobeConnect.step2Mid")}<span className="text-foreground">Restart</span>{t("settings.gpu.fuobeConnect.step2End")}
        </li>
        {own && (
          <li>
            {t("settings.gpu.fuobeConnect.step3Pre")}<span className="text-foreground">Fuobe Connect</span>{t("settings.gpu.fuobeConnect.step3Mid")}<Copyable text={origin()} label={t("settings.gpu.fuobeConnect.studioAddressLabel")} />{t("settings.gpu.fuobeConnect.step3Post")}
          </li>
        )}
      </ol>
      <p className="text-[12px] text-muted-foreground">
        {t("settings.gpu.fuobeConnect.notePre")}<Copyable text={`git clone ${FUOBE_CONNECT.gitUrl}`} label={t("settings.gpu.fuobeConnect.gitCmdLabel")} />{t("settings.gpu.fuobeConnect.notePost")}
      </p>
      {then && <p className="text-[12px] text-muted-foreground">{then}</p>}
    </div>
  );
}

async function pairCall<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error ?? `Request failed (${res.status})`);
  return j;
}

export function usePaired(enabled = true, fast = false) {
  return useQuery({
    queryKey: ["gpu", "paired"],
    queryFn: () => pairCall<{ paired: PairedComfy[] }>("GET", "/api/gpu/paired"),
    enabled,
    refetchInterval: fast ? 2000 : 30_000,
  });
}

const factsLine = (f: PairedComfy["facts"]) => [f.device && deviceLabel(f.device), gib(f.vramBytes)].filter(Boolean).join(" · ");

/**
 * Approve the code a ComfyUI shows (Fuobe Connect's "Connect to Fuobe"): the person sees the computer first, then
 * approves; the screen waits until that ComfyUI is heard from. `initial`: the code from the link ComfyUI opened.
 */
export function PairWithCode({ initial, className }: { initial?: string; className?: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [typed, setTyped] = useState(initial ?? "");
  const code = pairCode(typed);
  const [found, setFound] = useState<{ code: string; name: string; facts: PairedComfy["facts"] } | null>(null);
  const [approved, setApproved] = useState<{ id: string; name: string; settingsNeeded?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const paired = usePaired(!!approved, !!approved);
  const now = useNow(2000);
  const mine = approved && paired.data?.paired.find((p) => p.id === approved.id);
  const live = !!mine && pairedOnline(mine, now);

  // A whole code: the computer behind it, for the person to check.
  useEffect(() => {
    if (!code || found?.code === code || approved) return;
    let alive = true;
    pairCall<{ code: string; name: string; facts: PairedComfy["facts"] }>("GET", `/api/gpu/pair?code=${encodeURIComponent(code)}`).then(
      (f) => alive && setFound(f),
      (e: Error) => alive && (setFound(null), setError(e.message)),
    );
    return () => {
      alive = false;
    };
  }, [code, found?.code, approved]);

  useEffect(() => {
    if (!live) return;
    for (const key of ["account-gpu", "viewer", "status", "settings"]) void qc.invalidateQueries({ queryKey: [key] });
  }, [live, qc]);

  const answer = async (deny: boolean) => {
    if (!found) return;
    setBusy(true);
    setError(null);
    try {
      if (deny) {
        await pairCall("POST", "/api/gpu/pair", { code: found.code, deny: true });
        setFound(null);
        setTyped("");
        toast(t("settings.gpu.fuobeConnect.codeInvalidToast"));
      } else {
        const r = await pairCall<{ worker: { id: string; name: string }; settingsNeeded?: boolean }>("POST", "/api/gpu/pair", { code: found.code });
        setApproved({ ...r.worker, ...(r.settingsNeeded && { settingsNeeded: true }) });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (approved?.settingsNeeded)
    return (
      <div className={cn("space-y-1 rounded-xl bg-brand-faint p-3 text-[13px]", className)}>
        <p className="flex items-center gap-2 font-medium">
          <Check className="size-4 text-brand-text" /> {t("settings.gpu.fuobeConnect.isPaired", { name: approved.name })}
        </p>
        <p className="text-muted-foreground">{t("settings.gpu.fuobeConnect.settingsNeededNote")}</p>
      </div>
    );
  if (approved)
    return (
      <div className={cn("space-y-1 rounded-xl bg-brand-faint p-3 text-[13px]", className)}>
        {live ? (
          <p className="flex items-center gap-2 font-medium">
            <Check className="size-4 text-brand-text" /> {t("settings.gpu.fuobeConnect.isConnected", { name: approved.name })}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("settings.gpu.fuobeConnect.approvedWaiting", { name: approved.name })}
          </p>
        )}
      </div>
    );
  return (
    <div className={cn("space-y-2", className)}>
      <label className="flex flex-wrap items-center gap-2 text-[13px]">
        <KeyRound aria-hidden className="size-4 text-muted-foreground" />
        <span>{t("settings.gpu.fuobeConnect.codeLabel")}</span>
        <Input
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setError(null);
          }} placeholder="ABCD-EFGH" autoCapitalize="characters" autoComplete="off" spellCheck={false} className="h-9 w-36 font-mono tracking-widest uppercase" />
      </label>
      {found && (
        <div className="space-y-2 rounded-xl border p-3">
          <p className="flex items-center gap-2 text-[14px]">
            <Cpu aria-hidden className="size-4 text-brand-text" /> {t("settings.gpu.fuobeConnect.runJobsOnPre")}<span className="font-medium">{found.name}</span>
            {factsLine(found.facts) && <span className="text-muted-foreground">· {factsLine(found.facts)}</span>}{t("settings.gpu.fuobeConnect.runJobsOnPost")}
          </p>
          <p className="text-[12px] text-muted-foreground">{t("settings.gpu.fuobeConnect.approveOnlyOwnCode")}</p>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void answer(false)}>
              {t("settings.gpu.fuobeConnect.approve")}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void answer(true)}>
              {t("settings.gpu.fuobeConnect.notMyComputer")}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

/** "Or pair your ComfyUI with a code": for a browser or page that can't reach this computer. */
export function PairInstead({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("space-y-2 rounded-xl border bg-background p-3", className)}>
      <p className="text-[14px] font-medium">{t("settings.gpu.fuobeConnect.pairTitle")}</p>
      <p className="text-[13px] text-muted-foreground">
        {t("settings.gpu.fuobeConnect.pairPre", { name: FUOBE_CONNECT.name })}<Copyable text={FUOBE_CONNECT.search} label={t("settings.gpu.fuobeConnect.searchTermLabel")} />{t("settings.gpu.fuobeConnect.pairMid")}{" "}
        <Copyable text={`git clone ${FUOBE_CONNECT.gitUrl}`} label={t("settings.gpu.fuobeConnect.gitCmdLabel")} />{t("settings.gpu.fuobeConnect.pairPost")}
        <span className="text-foreground"> Extensions → Connect to Fuobe</span>{t("settings.gpu.fuobeConnect.pairTail")}
      </p>
      <PairWithCode />
    </div>
  );
}

/** The ComfyUIs paired with this person, each with Disconnect. Nothing when there are none. */
export function PairedComfyUIs({ className }: { className?: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = usePaired();
  const now = useNow(10_000);
  const [busy, setBusy] = useState<string | null>(null);
  const list = q.data?.paired ?? [];
  if (!list.length) return null;
  const drop = async (p: PairedComfy) => {
    setBusy(p.id);
    try {
      await pairCall("DELETE", `/api/gpu/paired/${encodeURIComponent(p.id)}`);
      void qc.invalidateQueries({ queryKey: ["gpu", "paired"] });
      toast(t("settings.gpu.fuobeConnect.disconnectToast", { name: p.name }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[13px] font-medium">{t("settings.gpu.fuobeConnect.pairedTitle")}</p>
      <ul className="space-y-1.5">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px]">
            <span className={cn("size-2 shrink-0 rounded-full", pairedOnline(p, now) ? "bg-brand-text" : "bg-muted-foreground/40")} aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              {p.name}
              {factsLine(p.facts) && <span className="text-muted-foreground"> · {factsLine(p.facts)}</span>}
              <span className="text-muted-foreground"> · {pairedOnline(p, now) ? t("settings.gpu.fuobeConnect.onlineStatus") : t("settings.gpu.fuobeConnect.offlineStatus")}</span>
            </span>
            <Button size="sm" variant="ghost" className="h-8" disabled={busy === p.id} onClick={() => void drop(p)}>
              <Unplug /> {t("settings.gpu.connectChoice.disconnect")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
