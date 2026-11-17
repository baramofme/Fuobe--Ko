"use client";

import { ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useKeyInfo, useRefreshKeyInfo } from "@/components/keys/use-key-info";
import { useNow } from "@/components/studio/use-now";
import { BILLING_URL } from "@/lib/diagnose";
import { accountWords, checkKeyWords, FAL_BALANCE_PERMISSION, money, noKeyYetWords, updatedWords, type ProviderAccount } from "@/lib/key-info";
import { CLOUD_KEY, type CloudProvider } from "@/lib/your-keys";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";

/*
 * Settings: what a saved fal.ai key or Replicate token tells about its provider account, under the key (the owner's
 * Paid API configuration, an account's Your keys). Asked when the card first scrolls into view, from the same minute-long
 * cache as the account menu, with this month's spend where the key may read it. A figure the provider doesn't give is
 * left out, and the provider's billing page is always one link away.
 */

const PANEL = "rounded-lg bg-muted/60 px-3 py-2.5 text-[13px]";

function Outbound({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const { t: tr } = useI18n();
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-1 font-medium text-brand-text underline-offset-2 hover:underline", className)}>
      {children}
      <ExternalLink aria-hidden className="size-3" />
      <span className="sr-only">{tr("settings.yourKeys.opensInNewTab")}</span>
    </a>
  );
}

function Row({ label, children, figure }: { label: string; children: React.ReactNode; figure?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 truncate", figure && "font-medium tabular-nums")}>{children}</dd>
    </>
  );
}

function Footer({ info, onRefresh, disabled, busy, children }: { info: ProviderAccount | undefined; onRefresh: () => void; disabled: boolean; busy: boolean; children?: React.ReactNode }) {
  const { t: tr } = useI18n();
  const now = useNow(30_000);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
      {children}
      <span className="ml-auto inline-flex items-center gap-2 text-muted-foreground">
        {info && <span>{updatedWords(info.checkedAt, Math.max(now, info.checkedAt))}</span>}
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          className="inline-flex min-h-6 items-center gap-1 rounded font-medium [@media(pointer:coarse)]:min-h-11 text-foreground underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          {busy && <Loader2 aria-hidden className="size-3 animate-spin" />}
          {tr("settings.yourKeys.refresh")}
        </button>
      </span>
    </div>
  );
}

/**
 * Under a fal.ai key that may not read its balance: the three steps to a key that may, from fal.ai's keys page, and
 * what the added permission lets Fuobe do. Folded, with the chevron Settings' other folded rows use. Each piece is read
 * through a key (byte-identical under English, Korean on the switch), so the whole steps read in the active language.
 */
function FalBalanceHow() {
  const { t: tr } = useI18n();
  return (
    <details className="group mt-2 text-[12px]">
      <summary className="flex min-h-6 w-fit cursor-pointer list-none items-center gap-1 font-medium [@media(pointer:coarse)]:min-h-11 text-foreground underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
        {tr("settings.yourKeys.falBalanceTitle")}
        <ChevronDown aria-hidden className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ol className="mt-1.5 max-w-prose list-decimal space-y-1 pl-4 text-muted-foreground marker:text-muted-foreground">
        <li>
          {tr("settings.yourKeys.falBalanceOpenBefore")} <Outbound href={CLOUD_KEY.fal.keysUrl}>{tr("settings.yourKeys.falBalanceOpenLink")}</Outbound> {tr("settings.yourKeys.falBalanceOpenAfter")}
        </li>
        <li>
          {tr("settings.yourKeys.falBalancePickBefore")} <code className="rounded bg-background px-1 font-mono text-[11px] text-foreground">{FAL_BALANCE_PERMISSION}</code>
          {tr("settings.yourKeys.falBalancePickAfter")}
        </li>
        <li>{tr("settings.yourKeys.falBalanceSave")}</li>
      </ol>
      <p className="mt-1.5 max-w-prose text-muted-foreground">{tr("settings.yourKeys.falBalanceWhy")}</p>
    </details>
  );
}

/**
 * The account behind a saved key. `scope`: whose key (the words for a key the provider didn't accept). `refused` and
 * `emptyNoted`: the card already says the provider stopped accepting the key, or that its balance ran out (Your keys),
 * so this doesn't say it again.
 */
export function KeyAccountDetails({
  provider,
  scope,
  refused,
  emptyNoted,
  className,
}: {
  provider: CloudProvider;
  scope: "owner" | "account";
  refused?: boolean;
  emptyNoted?: boolean;
  className?: string;
}) {
  const { t: tr } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      setSeen(true);
      io.disconnect();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  const q = useKeyInfo({ enabled: seen, detail: true });
  const { refresh, busy, cooling } = useRefreshKeyInfo(true);
  const { label } = CLOUD_KEY[provider];
  const info = q.data?.providers.find((x) => x.provider === provider);
  const footer = (more?: React.ReactNode) => (
    <Footer info={info} onRefresh={() => void refresh()} disabled={busy || cooling || q.isFetching} busy={busy}>
      {more}
    </Footer>
  );

  let body: React.ReactNode;
  if (!q.data && !q.isError) {
    // Until it is seen and answered: two quiet lines in the panel's place, so nothing below moves much.
    body = (
      <div aria-hidden className="grid gap-2 py-0.5">
        <span className="h-3.5 w-44 animate-pulse rounded bg-muted-foreground/15" />
        <span className="h-3 w-28 animate-pulse rounded bg-muted-foreground/15" />
      </div>
    );
  } else if (info?.state === "check-key") {
    if (refused) return null;
    body = <p className="text-[13px]">{checkKeyWords(provider, scope)}</p>;
  } else if (info?.balance) {
    // The balance (fal.ai keys that may read it).
    body = (
      <>
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-1">
          <Row label={tr("settings.yourKeys.balanceLabel")} figure>
            {money(info.balance)}
          </Row>
          {info.account && <Row label={tr("settings.yourKeys.accountLabel")}>{accountWords(info.account)}</Row>}
          {info.spentThisMonth && (
            <Row label={tr("settings.yourKeys.spentThisMonth")} figure>
              {money(info.spentThisMonth)}
            </Row>
          )}
        </dl>
        {info.state === "empty" && !emptyNoted && (
          <p className="mt-2">
            {tr("settings.yourKeys.balanceEmpty", { label })} <Outbound href={BILLING_URL[provider]}>{tr("settings.yourKeys.topUpOn", { label })}</Outbound>
          </p>
        )}
        {footer(info.state !== "empty" && <Outbound href={BILLING_URL[provider]}>{tr("settings.yourKeys.openBilling", { label })}</Outbound>)}
      </>
    );
  } else if (info?.state === "empty") {
    if (emptyNoted && !info.account) return null;
    body = (
      <>
        {info.account && (
          <dl className="mb-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6">
            <Row label={tr("settings.yourKeys.accountLabel")}>{accountWords(info.account)}</Row>
          </dl>
        )}
        {!emptyNoted && (
          <p>
            {tr("settings.yourKeys.balanceEmpty", { label })} <Outbound href={BILLING_URL[provider]}>{tr("settings.yourKeys.topUpOn", { label })}</Outbound>
          </p>
        )}
        {footer()}
      </>
    );
  } else {
    // No balance the key may read (Replicate has none; fal.ai's default API keys may not), or no answer: the link.
    body = (
      <>
        {info?.account && (
          <dl className="mb-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6">
            <Row label={tr("settings.yourKeys.accountLabel")}>{accountWords(info.account)}</Row>
          </dl>
        )}
        <p>
          {tr("settings.yourKeys.balanceOnBillingPage", { label })} <Outbound href={BILLING_URL[provider]}>{tr("settings.yourKeys.seeBalanceOn", { label })}</Outbound>
        </p>
        {provider === "fal" && info && <FalBalanceHow />}
        {footer()}
      </>
    );
  }
  return (
    <div ref={ref} aria-busy={!q.data && !q.isError} className={cn(PANEL, className)}>
      {body}
    </div>
  );
}

/** Your keys, a card with no key yet: what shows here once one is saved. */
export function NoKeyYet({ provider }: { provider: CloudProvider }) {
  useI18n(); // subscribe, so the switch re-renders the card with noKeyYetWords in the new language
  return <p className="rounded-lg border border-dashed px-3 py-2.5 text-[12px] text-muted-foreground">{noKeyYetWords(provider)}</p>;
}
