"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Heart, KeyRound, Loader2, LogOut, Scale, Trash2 } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";
import { GitHubMark } from "@/components/github-mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHashAnchor } from "@/components/use-hash-anchor";
import { announceAuthChange, leaveNotice, rememberViewer, signInHref, signOut, useHydrated, useViewer } from "@/lib/api";
import { FUOBE_REPO } from "@/lib/connections";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";

/** Settings' line under its title: what this viewer finds on the page. Nothing until the viewer is known (as below). */
export function SettingsIntro() {
  const { t } = useI18n();
  const hydrated = useHydrated();
  const v = useViewer().data;
  if (!hydrated || !v) return null;
  if (v.owner)
    return t("settings.intro.owner");
  return v.account ? t("settings.intro.account") : t("settings.intro.guest");
}

/**
 * The install's settings, for its owner only. A guest (public sign-up) is offered an account, which
 * connects its own GPU here; an account sees Your GPU (AccountGpuSection) and its account, nothing of the install's.
 * Both can read Thanks & licences.
 */
export function OwnerSettings({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  // The server renders nothing here (it doesn't know the viewer), so hydration must too, even when the browser's
  // viewer query has already answered (a component outside this page's boundary asked first).
  const hydrated = useHydrated();
  const v = useViewer().data;
  if (!hydrated || !v) return null;
  if (v.owner) return <>{children}</>;
  return (
    <>
      {v.account ? (
        <AccountSection email={v.account.email} />
      ) : (
        <section className="space-y-3 border-b py-8">
          <h2 className="text-[15px] font-semibold">{t("settings.signup.title")}</h2>
          <p className="max-w-xl text-[13px] text-pretty text-muted-foreground">
            {t("settings.signup.blurb")}
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href={signInHref("signup", "/settings#your-gpu")}>{t("settings.signup.signUpFree")}</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={signInHref("login", "/settings#your-gpu")}>{t("settings.signup.logIn")}</Link>
            </Button>
          </div>
        </section>
      )}
      <Licences />
    </>
  );
}

const linkCard = "inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-medium transition-colors hover:bg-accent";

/**
 * About's links: Thanks & licences and the source on GitHub for everyone, and the owner's Models & licences (its
 * switches; also its own section of the settings form).
 */
export function AboutLinks({ owner }: { owner?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap content-start gap-2">
      <Link href="/settings/licences" className={linkCard}>
        <Heart className="size-4 text-muted-foreground" /> {t("settings.about.thanksLicences")}
      </Link>
      {owner && (
        <Link href="/settings/models" className={linkCard}>
          <Scale className="size-4 text-muted-foreground" /> {t("settings.about.modelsLicences")}
        </Link>
      )}
      <a href={FUOBE_REPO} target="_blank" rel="noreferrer" className={linkCard}>
        <GitHubMark className="size-4 text-muted-foreground" /> {t("settings.about.source")}
      </a>
    </div>
  );
}

/** About, which everyone may read (the owner finds it in the settings form). */
function Licences() {
  const { t } = useI18n();
  return (
    <section id="about" aria-labelledby="about-title" className="grid grid-cols-[minmax(0,1fr)] gap-4 py-8 md:grid-cols-[260px_minmax(0,1fr)]">
      <div className="min-w-0">
        <h2 id="about-title" className="text-[15px] font-semibold">
          {t("settings.about.title")}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("settings.about.blurb")}</p>
      </div>
      <AboutLinks />
    </section>
  );
}

/**
 * An account's own: changing its password, signing out, and deleting it (its password again, DELETE /api/auth/me),
 * which takes its runs, files and GPU with it.
 */
function AccountSection({ email }: { email: string }) {
  const { t } = useI18n();
  const id = useId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The password was wrong (403): only then is its field marked, not for "too many tries" or no answer.
  const [wrong, setWrong] = useState(false);
  // A link to /settings#account arrives before this section exists: it is scrolled to once it does.
  useHashAnchor("account", true);
  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setWrong(false);
    try {
      const res = await fetch("/api/auth/me", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (res.status === 204) {
        // This browser's other tabs hear it, then a full load (as a guest's): the page and every cached answer were the
        // account's. The home page says it was deleted, which a sign-out alone would look the same as.
        rememberViewer("guest");
        leaveNotice("account-deleted");
        announceAuthChange();
        window.location.replace(window.location.origin);
        return;
      }
      if (res.status === 401) {
        // This browser was signed out (the password was changed in another one): the page shows Log in instead.
        setBusy(false);
        setOpen(false);
        setPassword("");
        toast(t("settings.account.signedOut"), { description: t("settings.account.loginAgainToDelete") });
        void qc.invalidateQueries({ queryKey: ["viewer"] });
        void qc.invalidateQueries({ queryKey: ["status"] });
        announceAuthChange();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? t("settings.account.deleteFailed", { status: res.status }));
      setWrong(res.status === 403);
    } catch {
      setError(t("settings.account.cantReach"));
    }
    setBusy(false);
  };
  return (
    <section id="account" aria-labelledby="account-title" className="grid scroll-mt-28 grid-cols-[minmax(0,1fr)] gap-4 border-b py-8 md:scroll-mt-20 md:grid-cols-[260px_minmax(0,1fr)]">
      <div className="min-w-0">
        <h2 id="account-title" className="text-[15px] font-semibold">
          {t("settings.account.title")}
        </h2>
        <p className="mt-1 text-[13px] [overflow-wrap:anywhere] text-muted-foreground">{email}</p>
      </div>
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setChanging(true)}>
            <KeyRound /> {t("settings.account.changePassword")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void signOut()}>
            <LogOut /> {t("settings.account.signOut")}
          </Button>
        </div>
        <div className="space-y-2">
          <p className="max-w-xl text-[13px] text-pretty text-muted-foreground">
            {t("settings.account.deleteWarning")}
          </p>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setOpen(true)}>
            <Trash2 /> {t("settings.account.deleteAccount")}
          </Button>
        </div>
      </div>
      <ChangePassword email={email} open={changing} onOpenChange={setChanging} />
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (busy) return;
          setOpen(o);
          setPassword("");
          setError("");
          setWrong(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={remove} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("settings.account.deleteTitle")}</DialogTitle>
              <DialogDescription>
                {t("settings.account.deleteConfirm", { email })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-password`} className="text-[13px]">
                {t("settings.account.password")}
              </Label>
              <Input
                id={`${id}-password`}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={wrong}
                aria-describedby={error ? `${id}-error` : undefined}
                autoFocus
              />
              {error && (
                <p id={`${id}-error`} role="alert" className="text-[12px] text-destructive">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={busy}>
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={busy || !password}>
                {busy && <Loader2 className="animate-spin" />}
                {t("settings.account.deleteAccount")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** A password field with a button that shows what was typed (as on the sign-in page). */
function PasswordInput({ id, shown, onShow, ...props }: React.ComponentProps<typeof Input> & { id: string; shown: boolean; onShow: () => void }) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <Input id={id} type={shown ? "text" : "password"} className="pr-10" {...props} />
      <button
        type="button"
        onClick={onShow}
        aria-label={t("settings.account.showPassword")}
        aria-pressed={shown}
        aria-controls={id}
        className="absolute top-1/2 right-1 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/**
 * Settings → Account → Change password (PATCH /api/auth/me): the current password, then the new one. Every other
 * browser signed in to the account is signed out; this one stays signed in.
 */
function ChangePassword({ email, open, onOpenChange }: { email: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const id = useId();
  const qc = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The current password was wrong (403): only then is its field marked, not for "too many tries" or no answer.
  const [wrong, setWrong] = useState(false);
  const short = next.length > 0 && next.length < 8;
  const reset = () => {
    setCurrent("");
    setNext("");
    setShown(false);
    setError("");
    setWrong(false);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setWrong(false);
    try {
      const res = await fetch("/api/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) });
      if (res.ok) {
        toast.success(t("settings.account.changed"), { description: t("settings.account.changedDesc") });
        reset();
        onOpenChange(false);
      } else if (res.status === 401) {
        // This browser was signed out (the password was changed in another one): the page shows Log in instead.
        setBusy(false);
        reset();
        onOpenChange(false);
        toast(t("settings.account.signedOut"), { description: t("settings.account.loginAgainToChange") });
        void qc.invalidateQueries({ queryKey: ["viewer"] });
        void qc.invalidateQueries({ queryKey: ["status"] });
        announceAuthChange();
        return;
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? t("settings.account.changeFailed", { status: res.status }));
        setWrong(res.status === 403);
      }
    } catch {
      setError(t("settings.account.cantReach"));
    }
    setBusy(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        onOpenChange(o);
        reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("settings.account.changeTitle")}</DialogTitle>
            <DialogDescription>{t("settings.account.changeDescription")}</DialogDescription>
          </DialogHeader>
          {/* The account's email, for password managers: they update its saved login rather than save a new one. */}
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-current`} className="text-[13px]">
              {t("settings.account.currentPassword")}
            </Label>
            <PasswordInput
              id={`${id}-current`}
              shown={shown}
              onShow={() => setShown((s) => !s)}
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              aria-invalid={wrong}
              aria-describedby={error ? `${id}-error` : undefined}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-new`} className="text-[13px]">
              {t("settings.account.newPassword")}
            </Label>
            <PasswordInput
              id={`${id}-new`}
              shown={shown}
              onShow={() => setShown((s) => !s)}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              aria-invalid={short}
              aria-describedby={`${id}-hint`}
            />
            <p id={`${id}-hint`} className={cn("text-[12px]", short ? "text-destructive" : "text-muted-foreground")}>
              {short ? t("settings.account.minLengthMore", { more: 8 - next.length }) : t("settings.account.minLength")}
            </p>
          </div>
          {error && (
            <p id={`${id}-error`} role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={busy}>
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={busy || !current || next.length < 8}>
              {busy && <Loader2 className="animate-spin" />}
              {t("settings.account.changePassword")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
