/**
 * The words for a run's place in line on this install's GPUs (hosted runs). Before Run, the line under the toolbar says
 * when the result would be ready ("Ready in about 2 min", "Starts when a GPU is free", "Ready in seconds"); a run's tile
 * says where it is and when ("Next in line · ready in about 40 s", "In line · 3rd · starts when a GPU is free"). A run
 * shows only "In line", "Working", then its result: it is taken whatever the line, and never ends for a wait.
 *
 * A run can also be made and wait to enter the line (`held`): behind the account's other runs ("In line · after your
 * other runs"), until a time ("Lots of runs today · starts in about 7 h" before Run, "In line · starts in about 7 h" on
 * its tile), or while runs there are paused ("In line · starts when a GPU is free"). Its tile still says only "In line".
 */

/** Why a run made now waits to enter the line (server: pool-holds.ts). */
export type HeldReason = "mine" | "today" | "service" | "hour" | "list" | "credits";

import { t } from "./i18n/store";

/**
 * A place in line (1: next) and the wait, about (`etaSeconds`, until the result; null: unknown). `unknown`: no GPU that
 * could run it can take it now, so it starts when one is free; `returnAt` (epoch ms): when the first of them is due
 * back, when one says. `light`: light work only (joins, trims), which needs no GPU. `held`: it waits to enter the line
 * (until `startAt`, epoch ms, when it has one; `paused`: runs there are paused, with the words to say before Run in
 * `note`).
 */
export interface LineFacts {
  place: number;
  etaSeconds: number | null;
  unknown?: boolean;
  returnAt?: number;
  light?: boolean;
  held?: HeldReason;
  startAt?: number;
  paused?: boolean;
  note?: string;
}

/** "about 40 s", "about 2 min", "about 3 h". */
export function aboutWords(seconds: number): string {
  if (seconds < 60) return t("studio.pool.aboutSec", { n: Math.max(5, Math.round(seconds / 5) * 5) });
  if (seconds < 90 * 60) return t("studio.pool.aboutMin", { n: Math.max(1, Math.round(seconds / 60)) });
  return t("studio.pool.aboutHour", { n: Math.round(seconds / 3600) });
}

/** "starts in about 7 h": when a run waiting for a time starts. */
const startsWords = (startAt: number | undefined, now: number): string => t("studio.pool.startsIn", { w: aboutWords(Math.max(0, ((startAt ?? now) - now) / 1000)) });

/**
 * When the run would be done, or start, in words inside a sentence: "ready in about 40 s", "ready in seconds", "starts
 * when a GPU is free", "starts in about 3 h", "starts after your other runs". Null when nothing is known (no estimate
 * yet): nothing is guessed.
 */
export function waitWords(q: LineFacts, now = Date.now()): string | null {
  if (q.light) return t("studio.pool.readyInSeconds");
  if (q.held === "mine") return t("studio.pool.startsAfterMine");
  if (q.held === "list") return t("studio.pool.startsWhenIn");
  if (q.held === "today" || q.held === "hour" || q.held === "credits") return startsWords(q.startAt, now);
  if (q.held === "service" && q.paused) return t("studio.pool.startsWhenFree");
  if (q.unknown) {
    const ms = q.returnAt ? q.returnAt - now : 0;
    return ms > 0 ? t("studio.pool.startsIn", { w: aboutWords(ms / 1000) }) : t("studio.pool.startsWhenFree");
  }
  const s = q.etaSeconds;
  return s === null || !Number.isFinite(s) || s < 0 ? null : t("studio.pool.readyIn", { w: aboutWords(s) });
}

/** The same words opening a line of their own ("Ready in about 2 min"). */
export const capitalFirst = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * The line under the toolbar before Run, as a sentence of its own: "Ready in about 2 min", "Starts after your other
 * runs", "Lots of runs today · starts in about 7 h", "Starts in about 7 h, when your free generations renew", the
 * service's own words while runs there are paused. Null when nothing is known.
 */
export function noteWords(q: LineFacts, now = Date.now()): string | null {
  if (q.held === "service" && q.paused && q.note) return q.note;
  const wait = waitWords(q, now);
  if (!wait) return null;
  if (q.held === "today") return t("studio.pool.noteToday", { wait });
  if (q.held === "credits") return t("studio.pool.noteCredits", { a: capitalFirst(wait) });
  if (q.held === "list") return t("studio.pool.noteList");
  return capitalFirst(wait);
}

/**
 * "In line · 3rd · ready in about 2 min": a run's place on this install's GPUs (1: next), and its wait (waitWords). A run
 * waiting to enter the line: "In line · after your other runs" (with when it would be ready, when known), "In line ·
 * starts in about 7 h", "In line · starts when a GPU is free"; one waiting for the service, its place as if in line.
 */
export function lineWords(q: LineFacts, now = Date.now()): string {
  if (q.held === "mine") {
    const s = q.etaSeconds;
    return s !== null && Number.isFinite(s) && s >= 0 ? t("studio.pool.heldMineReady", { w: aboutWords(s) }) : t("studio.pool.heldMine");
  }
  if (q.held === "list") return t("studio.pool.heldList");
  if (q.held && q.held !== "service") return t("studio.pool.lineJoin", { a: t("studio.pool.inLine"), b: waitWords(q, now) ?? "" });
  if (q.held === "service" && q.paused) return t("studio.pool.lineJoin", { a: t("studio.pool.inLine"), b: t("studio.pool.startsWhenFree") });
  const n = Math.max(1, Math.floor(q.place));
  const ord = n % 100 >= 11 && n % 100 <= 13 ? "th" : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th");
  const head = n === 1 ? t("studio.pool.nextInLine") : t("studio.pool.inLineNth", { n, ord });
  const wait = waitWords(q, now);
  return wait ? t("studio.pool.lineJoin", { a: head, b: wait }) : head;
}
