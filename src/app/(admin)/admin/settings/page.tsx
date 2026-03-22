"use client";

import { useThemeStore } from "@/stores/theme-store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const themeModes = [
  { mode: "light" as const, label: "Light", icon: Sun },
  { mode: "dark" as const, label: "Dark", icon: Moon },
  { mode: "system" as const, label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const { mode, setMode } = useThemeStore();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" backHref="/admin" />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Choose your preferred theme mode</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {themeModes.map((t) => {
                const Icon = t.icon;
                const isActive = mode === t.mode;
                return (
                  <button
                    key={t.mode}
                    onClick={() => setMode(t.mode)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all",
                      isActive
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{t.label}</span>
                    {isActive && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
