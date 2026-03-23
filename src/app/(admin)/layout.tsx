"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { AdminBottomNav } from "@/components/layout/bottom-nav";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, _hasHydrated } = useAuthStore();
  const router = useRouter();

  // Redirect to login if not authenticated, or to store if not super_admin
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!profile) {
      router.push("/login");
    } else if (profile.role !== "super_admin") {
      router.push("/store");
    }
  }, [profile, _hasHydrated, router]);

  // Don't render until hydrated
  if (!_hasHydrated) return null;
  if (!profile) return null;
  if (profile.role !== "super_admin") return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-6">
        <div className="mx-auto w-full max-w-7xl px-4 py-6">
          {children}
        </div>
      </main>
      <AdminBottomNav />
    </div>
  );
}
