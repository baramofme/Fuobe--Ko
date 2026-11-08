"use client";

import { BellRing } from "lucide-react";
import { useId } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useHydrated } from "@/lib/api";
import { useNotificationPrefs } from "@/lib/notification-prefs";

/** Settings → Notifications: this browser's opt-in for "your job is done" notifications. */
export function NotificationSettings() {
  const id = useId();
  const { t } = useI18n();
  const hydrated = useHydrated();
  const { enabled, permission, setEnabled } = useNotificationPrefs();
  if (!hydrated) return <div className="h-14" aria-hidden />;
  if (permission === "unsupported") {
    return (
      <p className="rounded-lg bg-muted px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">{t("settings.panel.notifications.unsupported")}</p>
    );
  }
  const blocked = permission === "denied";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
          <span className="block text-[13px] font-medium">{t("settings.panel.notifications.tellMeWhenJobDone")}</span>
          <span className="block text-[12px] leading-snug text-muted-foreground">
            {t("settings.panel.notifications.tellMeDesc")}
          </span>
        </label>
        <Switch
          id={id}
          checked={enabled}
          disabled={blocked}
          onCheckedChange={(v) =>
            void setEnabled(v).then((on) => {
              if (v && !on) toast(t("settings.panel.notifications.blockedToast"), { description: t("settings.panel.notifications.blockedToastDesc") });
            })
          }
        />
      </div>
      {blocked && <p className="text-[12px] text-muted-foreground">{t("settings.panel.notifications.blockedSite")}</p>}
      {enabled && (
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => {
            try {
              new Notification(t("settings.panel.notifications.testTitle"), { body: t("settings.panel.notifications.testBody"), tag: "fuobe-test", icon: "/favicon.ico" });
            } catch {
              toast.error(t("settings.panel.notifications.installedAppOnly"));
            }
          }}
        >
          <BellRing className="size-3.5" /> {t("settings.panel.notifications.sendATest")}
        </Button>
      )}
    </div>
  );
}
