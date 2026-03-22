"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Users, Store, Shield, Settings, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useUsersStore } from "@/stores/users-store";
import { useStoresStore } from "@/stores/stores-store";
import { useRolesStore } from "@/stores/roles-store";

export default function AdminDashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const { users, isLoaded: usersLoaded, fetchUsers } = useUsersStore();
  const { stores, isLoaded: storesLoaded, fetchStores } = useStoresStore();
  const { roles, isLoaded: rolesLoaded, fetchRoles } = useRolesStore();

  useEffect(() => {
    if (!usersLoaded) fetchUsers();
    if (!storesLoaded) fetchStores();
    if (!rolesLoaded) fetchRoles();
  }, [usersLoaded, storesLoaded, rolesLoaded, fetchUsers, fetchStores, fetchRoles]);

  const modules = [
    {
      title: "Users",
      description: "Manage all users, assign roles and stores",
      href: "/admin/users",
      icon: Users,
      count: users.length,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    },
    {
      title: "Stores",
      description: "Manage stores, assign admins and themes",
      href: "/admin/stores",
      icon: Store,
      count: stores.length,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    },
    {
      title: "Roles & Permissions",
      description: "Define roles with CRUD permissions",
      href: "/admin/roles",
      icon: Shield,
      count: roles.length,
      iconColor: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-500/10 dark:bg-violet-500/20",
    },
    {
      title: "Settings",
      description: "Theme, appearance and platform config",
      href: "/admin/settings",
      icon: Settings,
      count: null,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome, {profile?.name ?? "Admin"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your JyGS platform from here.
        </p>
      </div>

      {/* Module Cards — 2x2 grid */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.title}
              href={mod.href}
              className="group flex flex-col justify-between rounded-2xl border bg-card p-5 sm:p-7 transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 min-h-[200px] sm:min-h-[240px]"
            >
              {/* Top: Icon */}
              <div>
                <div className={`flex size-12 sm:size-14 items-center justify-center rounded-xl ${mod.iconBg}`}>
                  <Icon className={`size-6 sm:size-7 ${mod.iconColor}`} />
                </div>
              </div>

              {/* Bottom: Title + Description + Arrow */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
                  {mod.title}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug">
                  {mod.description}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                  Open
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
