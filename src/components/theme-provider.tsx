"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme-store";
import { useAuthListener } from "@/hooks/use-auth-listener";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeStore();

  // Sync Supabase auth state changes with Zustand store
  useAuthListener();

  useEffect(() => {
    const root = document.documentElement;

    if (mode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      root.classList.toggle("dark", mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle("dark", e.matches);
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      root.classList.toggle("dark", mode === "dark");
    }
  }, [mode]);

  return <>{children}</>;
}

