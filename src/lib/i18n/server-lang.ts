import "server-only";

import { cookies } from "next/headers";
import { DEFAULT_LANG, isLang, LANG_COOKIE, type Lang } from "./store";

/**
 * The language a server render should use: the person's saved choice (switchLanguage mirrors it to this cookie),
 * or the default (English) when nothing is saved yet. Client components use useI18n instead; this is for anything
 * rendered on the server that needs to pick the right words.
 */
export async function getServerLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}
