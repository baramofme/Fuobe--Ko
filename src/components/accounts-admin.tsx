"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Images, Info, Loader2, Trash2, UserX, UserCheck } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useHydrated, useViewer } from "@/lib/api";
import { storageSize, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { responseError, toastError } from "@/lib/refusals";
import { useI18n } from "@/lib/i18n/use-i18n";

/** An account as GET /api/admin/accounts lists it: who, and what it made (src/server/account-admin.ts). */
export interface AccountRow {
  id: string;
  email: string;
  createdAt: number;
  lastLoginAt: number | null;
  disabled: boolean;
  gpu: boolean;
  /** The providers it added its own key for (Your keys): never a key. */
  keys?: ("fal" | "replicate")[];
  /** Runs: all time, the last 24 hours and 7 days, going now, failed in the last 7 days. */
  runs: number;
  runsDay: number;
  runsWeek: number;
  running: number;
  failedWeek: number;
  lastRunAt: number | null;
  /** Its files on this server, and what it may keep. */
  bytes: number;
  capBytes: number;
}

/** Every account's runs and files together; `shareBytes`: the part of the disk accounts may take (null: unknown). */
export interface AccountTotals {
  accounts: number;
  runsDay: number;
  runsWeek: number;
  running: number;
  bytes: number;
  shareBytes: number | null;
}

export async function adminCall<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 204) return undefined as T;
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw responseError(res, j.error ?? "Something went wrong. Please try again.");
  return j;
}

/**
 * An auth.json found in the data folder after sign-in data moved into the database, set aside unread (src/server/auth-store.ts):
 * its name and counts only. `counts` is null when the file isn't sign-in data.
 */
export interface SignInNoticeRow {
  file: string;
  foundAt: number;
  reason: "stray" | "unreadable" | "link" | "import-failed";
  counts: { accounts: number; tokens: number; accountsNotInDatabase: number } | null;
}

/** The owner's note about one set-aside auth.json: what it is, that nothing in it is used, and what to do about it. */
function SignInNotice({ notice: n }: { notice: SignInNoticeRow }) {
  const { t } = useI18n();
  const c = n.counts;
  const word = (k: number, oneKey: string, manyKey: string) => `${k} ${t(k === 1 ? oneKey : manyKey)}`;
  const lead = n.reason === "import-failed" ? t("settings.accounts.noticeLeadFailed") : t("settings.accounts.noticeLeadPlain");
  return (
    <p role="status" className="flex items-start gap-1.5 rounded-lg bg-warning/10 px-2.5 py-2 text-[12px] text-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0 text-warning" />
      <span className="min-w-0">
        {t("settings.accounts.noticeFound", { lead, ago: timeAgo(n.foundAt) })}<code className="break-all">{n.file}</code>{t("settings.accounts.noticeAfterCode")}
        {c
          ? t("settings.accounts.noticeLists", { accounts: word(c.accounts, "settings.accounts.accountOne", "settings.accounts.accountMany"), tokens: word(c.tokens, "settings.accounts.tokenOne", "settings.accounts.tokenMany"), accountsNotIn: c.accountsNotInDatabase, accountsN: c.accounts, tokensN: c.tokens })
          : n.reason === "link"
            ? t("settings.accounts.noticeLink")
            : t("settings.accounts.noticeUnreadable")}
        {c && c.accountsNotInDatabase > 0 ? t("settings.accounts.noticeKept") : ""}
        {t("settings.accounts.noticeDelete")}
      </span>
    </p>
  );
}

/** Everyone who signed up, with their numbers (the owner only). Settings and the runs page share it; it refreshes while runs are going. */
export function useAdminAccounts(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-accounts"],
    queryFn: () => adminCall<{ total: number; items: AccountRow[]; totals: AccountTotals; signInNotices?: SignInNoticeRow[] }>("/api/admin/accounts"),
    enabled,
    refetchInterval: (q) => (q.state.data?.totals.running ? 15_000 : false),
  });
}

/** Do one of the owner's account actions, say how it went, and refresh the accounts and their runs. */
export function useAdminAction() {
  const qc = useQueryClient();
  return async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      toast.success(done);
    } catch (e) {
      toastError(e);
    } finally {
      void qc.invalidateQueries({ queryKey: ["admin-accounts"] });
      void qc.invalidateQueries({ queryKey: ["admin-runs"] });
    }
  };
}

/** One number in a line of them (inside a `dl`): its label, then the number. */
export function Stat({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium whitespace-nowrap tabular-nums", className)}>{children}</dd>
    </div>
  );
}

/** The account is switched off. */
export function OffBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return <span className={cn("rounded-sm bg-muted px-1 py-0.5 text-[10px] font-normal text-muted-foreground", className)}>{t("settings.off")}</span>;
}

/** The runs page for one account (else every account's), with its status and kind filters ("all" and unset are left out). */
export function runsHref({ account, status, kind }: { account?: string; status?: string; kind?: string } = {}): string {
  const q = new URLSearchParams();
  if (account) q.set("account", account);
  if (status && status !== "all") q.set("status", status);
  if (kind && kind !== "all") q.set("kind", kind);
  const s = q.toString();
  return s ? `/settings/runs?${s}` : "/settings/runs";
}

/** Settings' strip (the owner): how many accounts, 0 included, and the way down to Accounts, the last section. */
export function AccountsChip() {
  // Nothing until hydrated, as in the server's HTML, even when the answers are already in the cache.
  const { t } = useI18n();
  const hydrated = useHydrated();
  const owner = useViewer().data?.owner;
  const q = useAdminAccounts(!!owner);
  if (!hydrated || !owner || !q.data) return null;
  return (
    <a href="#accounts" className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 text-[12px] whitespace-nowrap transition-colors hover:bg-accent">
      <span className="text-muted-foreground">{t("settings.accounts.chipLabel")}</span>
      <span className="font-medium">{q.data.total}</span>
      {q.data.totals.running > 0 && <span className="text-muted-foreground">{t("settings.accounts.chipRunning", { n: q.data.totals.running })}</span>}
    </a>
  );
}

const OWNER_MOVES = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/**
 * /settings#accounts (the runs page's "← Settings", a bookmark) arrives before this list and the sections
 * above it have loaded, so the browser finds no anchor, or one that moves down as they grow: go to it once the list is
 * here, and stay on it while the page above grows, until the owner scrolls or 10 seconds pass.
 */
function useAccountsAnchor(ready: boolean) {
  useEffect(() => {
    if (!ready || window.location.hash !== "#accounts") return;
    const go = () => document.getElementById("accounts")?.scrollIntoView({ block: "start" });
    const ro = new ResizeObserver(go);
    const stop = () => {
      ro.disconnect();
      clearTimeout(timer);
      for (const e of OWNER_MOVES) window.removeEventListener(e, stop);
    };
    const timer = setTimeout(stop, 10_000);
    go();
    ro.observe(document.body);
    for (const e of OWNER_MOVES) window.addEventListener(e, stop, { passive: true });
    return stop;
  }, [ready]);
}

/** Settings → Accounts (the owner only): who signed up (public sign-up), what each made and the space it takes, with switch-off, delete and a CSV export. */
export function AccountsAdmin() {
  const { t } = useI18n();
  const hydrated = useHydrated();
  const owner = useViewer().data?.owner;
  const q = useAdminAccounts(!!owner);
  const act = useAdminAction();
  useAccountsAnchor(!!q.data);
  if (!hydrated || !owner || (!q.data && !q.isError)) return null;
  const total = q.data?.total ?? 0;
  return (
    <section id="accounts" aria-labelledby="accounts-title" className="grid scroll-mt-28 grid-cols-[minmax(0,1fr)] gap-6 border-t py-8 md:scroll-mt-20 md:grid-cols-[260px_minmax(0,1fr)]">
      <div className="min-w-0">
        <h2 id="accounts-title" className="text-[15px] font-semibold">
          {t("settings.accounts.title")}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {q.data && (
            <>
              {t("settings.accounts.signedUp", { total, people: t(total === 1 ? "settings.accounts.signedUpOne" : "settings.accounts.signedUpMany") })}
            </>
          )}
          {t("settings.accounts.blurbBody")}
        </p>
      </div>
      {!q.data ? (
        <div className="min-w-0 space-y-3">
          <p className="text-[13px] text-destructive">{t("settings.accounts.loadFailed")}{q.error?.message}</p>
          <Button size="sm" variant="secondary" disabled={q.isFetching} onClick={() => void q.refetch()}>
            {t("settings.accounts.tryAgain")}
          </Button>
        </div>
      ) : (
        <div className="min-w-0 space-y-3">
          {q.data.signInNotices?.map((n) => <SignInNotice key={n.file} notice={n} />)}
          {total > 0 && (
            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
              <Stat label={t("settings.accounts.statRuns24")}>{q.data.totals.runsDay}</Stat>
              <Stat label={t("settings.accounts.statRuns7")}>{q.data.totals.runsWeek}</Stat>
              <Stat label={t("settings.accounts.statRunning")}>{q.data.totals.running}</Stat>
              <Stat label={t("settings.accounts.statFiles")}>
                {storageSize(q.data.totals.bytes)}
                {q.data.totals.shareBytes ? t("settings.accounts.filesOf", { size: storageSize(q.data.totals.shareBytes) }) : ""}
              </Stat>
            </dl>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="secondary" disabled={!total}>
              <Link href="/settings/runs">
                <Images /> {t("settings.accounts.allRuns")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary" disabled={!total}>
              <a href="/api/admin/accounts?format=csv" download>
                <Download /> {t("settings.accounts.exportCsv")}
              </a>
            </Button>
            {q.isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          {q.data.items.length > 0 && (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("settings.accounts.colEmail")}</th>
                    <th className="px-3 py-2 font-medium">{t("settings.accounts.colRuns")}</th>
                    <th className="px-3 py-2 font-medium">{t("settings.accounts.colLastRun")}</th>
                    <th className="px-3 py-2 font-medium">{t("settings.accounts.colSpace")}</th>
                    <th className="px-3 py-2 font-medium">{t("settings.accounts.colGpu")}</th>
                    <th className="px-3 py-2 font-medium">{t("settings.accounts.colKeys")}</th>
                    <th className="px-3 py-2 font-medium max-2xl:hidden">{t("settings.accounts.colCreated")}</th>
                    <th className="px-3 py-2 font-medium max-2xl:hidden">{t("settings.accounts.colLastLogin")}</th>
                    {/* The actions stay in view when the table is wider than its box (a long email, a phone); what's under them fades out. */}
                    <th className="sticky right-0 bg-background bg-linear-to-r from-muted/50 to-muted/50 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {q.data.items.map((a) => (
                    <tr key={a.id} className={a.disabled ? "text-muted-foreground" : undefined}>
                      <td className="max-w-40 truncate px-3 py-2 font-medium 2xl:max-w-56" title={a.email}>
                        {a.email}
                        {a.disabled && <OffBadge className="ml-1.5" />}
                      </td>
                      <td className="px-3 py-2">
                        <Link href={runsHref({ account: a.id })} className="font-medium tabular-nums underline-offset-2 hover:underline">
                          {a.runs}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">
                          <span className="whitespace-nowrap">{a.runsWeek} {t("settings.accounts.in7days")}</span>
                          {a.failedWeek > 0 && <span className="whitespace-nowrap text-destructive"> · {a.failedWeek} {t("settings.accounts.failed")}</span>}
                          {a.running > 0 && <span className="whitespace-nowrap"> · {a.running} {t("settings.accounts.running")}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{a.lastRunAt ? timeAgo(a.lastRunAt) : "—"}</td>
                      <td className={cn("px-3 py-2 whitespace-nowrap", a.bytes >= 0.9 * a.capBytes && "text-warning")} title={t("settings.accounts.spaceTitle")}>
                        {storageSize(a.bytes)}{t("settings.accounts.filesOf", { size: storageSize(a.capBytes) })}
                      </td>
                      <td className="px-3 py-2">{a.gpu ? t("settings.accounts.connected") : "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap" title={t("settings.accounts.keysTitle")}>
                        {a.keys?.length ? a.keys.map((k) => (k === "fal" ? "fal.ai" : "Replicate")).join(", ") : t("settings.accounts.none")}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap max-2xl:hidden">{timeAgo(a.createdAt)}</td>
                      <td className="px-3 py-2 whitespace-nowrap max-2xl:hidden">{a.lastLoginAt ? timeAgo(a.lastLoginAt) : "—"}</td>
                      <td className="sticky right-0 bg-background px-2 py-1 text-right whitespace-nowrap before:pointer-events-none before:absolute before:inset-y-0 before:right-full before:w-4 before:bg-linear-to-l before:from-background">
                        <Button asChild size="icon" variant="ghost" className="size-7 text-muted-foreground">
                          <Link href={runsHref({ account: a.id })} aria-label={t("settings.accounts.runsBy", { email: a.email })} title={t("settings.accounts.colRuns")}>
                            <Images className="size-3.5" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground"
                          aria-label={a.disabled ? t("settings.accounts.switchOnAria", { email: a.email }) : t("settings.accounts.switchOffAria", { email: a.email })}
                          title={a.disabled ? t("settings.accounts.switchOnShort") : t("settings.accounts.switchOffShort")}
                          onClick={() => void act(() => adminCall(`/api/admin/accounts/${a.id}`, "PATCH", { disabled: !a.disabled }), a.disabled ? t("settings.accounts.switchedOn") : t("settings.accounts.switchedOff"))}
                        >
                          {a.disabled ? <UserCheck className="size-3.5" /> : <UserX className="size-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          aria-label={t("settings.accounts.deleteAria", { email: a.email })}
                          title={t("settings.accounts.deleteTitle")}
                          onClick={() => {
                            if (window.confirm(t("settings.accounts.deleteConfirm", { email: a.email }))) void act(() => adminCall(`/api/admin/accounts/${a.id}`, "DELETE"), t("settings.accounts.deleted"));
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
