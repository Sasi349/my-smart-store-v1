"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRolesStore } from "@/stores/roles-store";
import type { Module } from "@/types";

type PermissionAction = "canCreate" | "canRead" | "canUpdate" | "canDelete";

export function usePermissions() {
  const { profile } = useAuthStore();
  const { roles, isLoaded, fetchRoles } = useRolesStore();

  // Fetch roles if not loaded yet (needed for employee permission lookups)
  useEffect(() => {
    if (profile?.role === "employee" && !isLoaded) {
      fetchRoles();
    }
  }, [profile?.role, isLoaded, fetchRoles]);

  const isAdmin = profile?.role === "super_admin" || profile?.role === "shop_admin";

  function hasPermission(module: Module, action: PermissionAction): boolean {
    if (!profile) return false;

    // Super admins and shop admins have full access
    if (isAdmin) return true;

    // Employees check their role's permissions
    if (profile.role === "employee" && profile.role_id) {
      const role = roles.find((r) => r.id === profile.role_id);
      if (!role) return false;

      const perm = role.permissions.find((p) => p.module === module);
      if (!perm) return false;

      return perm[action];
    }

    return false;
  }

  function canAccessModule(module: Module): boolean {
    return hasPermission(module, "canRead");
  }

  return {
    hasPermission,
    canAccessModule,
    isAdmin,
    isSuperAdmin: profile?.role === "super_admin",
    isShopAdmin: profile?.role === "shop_admin",
    isEmployee: profile?.role === "employee",
    isLoaded: isAdmin || isLoaded,
  };
}
