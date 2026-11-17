import { connection } from "next/server";
import { z } from "zod";
import type { ChatMe } from "@/lib/chat/types";
import { siteStatus } from "@/server/chat/backend";
import { activeLocal, localServers } from "@/server/llm";
import { body, chatViewer, refused, signUp, tooOften } from "@/server/chat/http";
import { getPrefs, setEngine, setKeyModel, setMature } from "@/server/chat/store";

async function me(who: string, owner: boolean): Promise<ChatMe> {
  const p = getPrefs(who);
  const s = siteStatus(who);
  const r = await activeLocal();
  // null: the install has no local server configured at all. With one: whether it can take calls now, and what it uses.
  const local = localServers().length ? { on: !!r, label: r?.server.label ?? "your local server", model: r?.status.model ?? null } : null;
  return { site: s.on, siteKnown: s.known, key: p.key, engine: p.engine, mature: p.mature, owner, local };
}

/** The person's chat settings and what can answer them now. */
export async function GET(request: Request) {
  await connection();
  const v = chatViewer(request);
  if (!v) return signUp();
  return Response.json(await me(v.who, v.owner));
}

const Patch = z.object({
  /** Mango Chilli mode: turning it on needs `adult: true` (the person said they're 18 or older). */
  mature: z.boolean().optional(),
  adult: z.boolean().optional(),
  engine: z.enum(["site", "key", "local"]).optional(),
  model: z
    .string()
    .trim()
    .regex(/^[\w.:/-]{3,120}$/)
    .optional(),
});

export async function PATCH(request: Request) {
  const v = chatViewer(request);
  if (!v) return signUp();
  const limited = tooOften(v.who);
  if (limited) return limited;
  const p = Patch.safeParse(await body(request));
  if (!p.success) return Response.json({ error: "Those settings couldn't be read." }, { status: 400 });
  try {
    if (p.data.mature === true && p.data.adult !== true) return Response.json({ error: "Confirm you're 18 or older to turn on Mango Chilli mode.", code: "adult" }, { status: 400 });
    if (p.data.mature !== undefined) setMature(v.who, p.data.mature);
    if (p.data.model) setKeyModel(v.who, p.data.model);
    if (p.data.engine) {
      // The local model is the install's own, never a shared helper for accounts: only the owner may pick it.
      if (p.data.engine === "local" && !v.owner) return Response.json({ error: "Only the install's owner can answer with the model on this machine.", code: "local-owner" }, { status: 403 });
      setEngine(v.who, p.data.engine);
    }
    return Response.json(await me(v.who, v.owner));
  } catch (e) {
    return refused(e);
  }
}
