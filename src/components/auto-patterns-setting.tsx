"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { PublicSetting } from "@/components/connect-field";
import { useI18n } from "@/lib/i18n/use-i18n";
import { autoPatternsProblems, DEFAULT_AUTO_PATTERNS } from "@/lib/auto-image";

/**
 * Settings → Auto image model: the prompts Auto starts on Krea 2 Realism (as it does every plain prompt), whose run
 * details name the line they matched, one per line. The owner's only, as every setting is. Saving checks each line;
 * Reset puts the built-in list back.
 */
export function AutoPatternsSetting({ setting, onSave, saving }: { setting: PublicSetting | undefined; onSave: (value: string) => void; saving: boolean }) {
  const { t } = useI18n();
  const saved = setting?.value ?? DEFAULT_AUTO_PATTERNS.join("\n");
  const [text, setText] = useState(saved);
  // A save (here, or Add a pattern on a run) changes what is saved: the box follows it.
  const [shown, setShown] = useState(saved);
  if (shown !== saved) {
    setShown(saved);
    setText(saved);
  }
  const problems = autoPatternsProblems(text);
  const changed = text.trim() !== saved.trim();
  return (
    <div className="space-y-2">
      <Label htmlFor="setting-auto-patterns" className="text-[13px] font-medium">
        {t("settings.panel.autoPatterns.promptsGoToKrea")}
      </Label>
      <textarea
        id="setting-auto-patterns"
        value={text}
        spellCheck={false}
        rows={10}
        onChange={(e) => setText(e.target.value)}
        className="block w-full resize-y rounded-xl border bg-background p-3 font-mono text-[12px] leading-relaxed"
      />
      <p className="text-[12px] leading-relaxed text-muted-foreground">{t("settings.panel.autoPatterns.hint")}</p>
      {problems.length > 0 && (
        <ul className="space-y-0.5 text-[12px] text-destructive">
          {problems.slice(0, 5).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={!changed || problems.length > 0 || saving} onClick={() => onSave(text)}>
          {t("common.save")}
        </Button>
        <Button size="sm" variant="outline" disabled={saving || !setting?.isSet} onClick={() => onSave("")}>
          {t("settings.panel.autoPatterns.resetToList")}
        </Button>
      </div>
    </div>
  );
}
