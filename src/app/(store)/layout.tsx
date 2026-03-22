"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { StoreBottomNav } from "@/components/layout/store-bottom-nav";
import { useAuthStore } from "@/stores/auth-store";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const { currentStore, _hasHydrated } = useAuthStore();
  const router = useRouter();

  // Redirect if no store selected (only after hydration)
  useEffect(() => {
    if (_hasHydrated && !currentStore) {
      router.push("/admin");
    }
  }, [currentStore, _hasHydrated, router]);

  // Don't render until hydrated
  if (!_hasHydrated) return null;
  if (!currentStore) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-6">
        <div className="mx-auto w-full max-w-7xl px-4 py-6">
          {children}
        </div>
      </main>
      <StoreBottomNav />
    </div>
  );
}
