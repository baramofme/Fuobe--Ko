"use client";

import { Globe, Search } from "lucide-react";
import { IntentLink } from "@/components/intent-link";
import { PhoneNavButton } from "@/components/nav/phone-nav-button";
import { useSearchPalette } from "@/components/nav/search-context";
import { UpdateAvailable } from "@/components/update-available";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SHORT: Record<Lang, string> = { en: "EN", ko: "KO" };

/** Opens the search: the way to search on a phone, where there's no keyboard shortcut. */
export function SearchButton({ className }: { className?: string }) {
  const search = useSearchPalette();
  const { t } = useI18n();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("nav-row size-11 rounded-full text-muted-foreground focus-visible:border-transparent focus-visible:ring-0 motion-reduce:transition-none", className)}
      aria-label={t("nav.searchAria")}
      aria-haspopup="dialog"
      onTouchStart={search.warm}
      onPointerEnter={search.warm}
      onFocus={search.warm}
      onClick={() => search.open()}
    >
      <Search className="size-5" aria-hidden />
    </Button>
  );
}

/**
 * The phone's compact language selector: a globe button that opens a list of the supported languages.
 * Sits in the phone header between the wordmark and the search/nav button.
 */
function PhoneLangSelector({ className }: { className?: string }) {
  const { lang, t, switchLanguage, languages, langNames } = useI18n();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t("selector.label")}
        className={cn("nav-row inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-wider text-muted-foreground focus-visible:border-transparent focus-visible:ring-0", className)}
      >
        <Globe aria-hidden className="size-[18px]" />
        <span className="sr-only">{SHORT[lang]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="w-40 p-1.5">
        {languages.map((l) => (
          <DropdownMenuItem
            key={l}
            onSelect={() => switchLanguage(l)}
            className="h-10 justify-start gap-2 rounded-[10px] px-2.5 text-[13.5px] font-medium"
            data-active={lang === l || undefined}
          >
            <span className="flex w-5 shrink-0 items-center justify-center text-[10px] font-bold text-muted-foreground">
              {SHORT[l]}
            </span>
            <span className={cn("min-w-0 flex-1", lang === l && "font-semibold text-foreground")}>
              {langNames[l]}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The phone header of gallery and settings pages: the wordmark (home), language and search; the tab bar at the bottom does the
 * rest. Clear of the notch and the rounded corners. Hidden from md up, where the top bar shows.
 */
export function PhoneBar({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "sticky top-chrome z-20 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-1.5 bg-background/85 pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))] backdrop-blur md:hidden",
        className,
      )}
    >
      <IntentLink
        href="/"
        eager
        aria-label={t("nav.homeAria")}
        className="nav-focus rounded-md px-1 font-heading text-[22px] leading-none"
      >
        Fuobe
      </IntentLink>
      <div className="ml-auto flex items-center gap-1.5">
        <PhoneLangSelector />
        <UpdateAvailable />
        <PhoneNavButton />
      </div>
    </div>
  );
}
