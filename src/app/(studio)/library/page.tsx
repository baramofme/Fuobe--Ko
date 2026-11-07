import type { Metadata } from "next";
import { LibraryView } from "@/components/library-view";
import { getServerLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/store";
import { starterCards } from "@/lib/starters/catalog";

/** Server-rendered metadata: the title follows the cookie's language on the server. */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return { title: translate(lang, "meta.library.title") };
}

export default function Page() {
  return <LibraryView starters={starterCards("library")} />;
}
