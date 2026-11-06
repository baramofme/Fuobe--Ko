"use client";

import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Short code for the trigger — 2-letter Latin, always uppercase. */
const SHORT: Record<Lang, string> = { en: "EN", ko: "KO" };

/**
 * The header's language selector: a small button showing the current language's short code with a globe icon.
 * Opens a dropdown listing the supported languages by their own names; picking one calls switchLanguage, which
 * notifies every useI18n subscriber so the whole page re-renders in the new language on the same tick.
 * The currently selected language is highlighted with a check icon and bold weight.
 */
export function LangSelector() {
  const { lang, t, switchLanguage, languages, langNames } = useI18n();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t("selector.label")}
        className={cn(
          "nav-focus inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] px-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground",
          "nav-hover:bg-[var(--nav-hi)] nav-hover:text-foreground active:bg-[var(--nav-press)] data-[state=open]:text-foreground",
          "[@media(pointer:coarse)]:h-11",
          "motion-safe:transition-colors",
        )}
      >
        <Globe aria-hidden className="size-[15px] shrink-0" />
        <span>{SHORT[lang]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} collisionPadding={12} className="w-44 p-1.5">
        {languages.map((l) => (
          <DropdownMenuItem
            key={l}
            onSelect={() => switchLanguage(l)}
            className="h-10 justify-start gap-2 rounded-[10px] px-2.5 text-[13.5px] font-medium"
            data-active={lang === l || undefined}
          >
            <span className="flex w-5 shrink-0 items-center justify-center">
              {lang === l && <Check aria-hidden className="size-[14px] text-brand-text" />}
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
