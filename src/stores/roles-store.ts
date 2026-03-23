import { create } from "zustand";
import type { Role, Permission } from "@/types";
import { MODULES } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  dbInsertRole,
  dbUpdateRole,
  dbDeleteRole,
  dbInsertPermissions,
  dbUpdatePermission,
  dbDeletePermissionsByRole,
} from "@/lib/db-actions";

type PermissionAction = "canCreate" | "canRead" | "canUpdate" | "canDelete";

interface RolesState {
  roles: Role[];
  searchQuery: string;
  isLoaded: boolean;
  fetchRoles: () => Promise<void>;
  addRole: (role: Omit<Role, "id" | "createdAt">) => Promise<void>;
  updateRole: (id: string, updates: Partial<Omit<Role, "id" | "createdAt">>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  togglePermission: (roleId: string, module: string, action: PermissionAction) => Promise<void>;
  filteredRoles: () => Role[];
}

function mapPermission(row: Record<string, unknown>): Permission {
  return {
    id: row.id as string,
    roleId: row.role_id as string,
    module: row.module as string,
    canCreate: row.can_create as boolean,
    canRead: row.can_read as boolean,
    canUpdate: row.can_update as boolean,
    canDelete: row.can_delete as boolean,
  };
}

function mapRole(row: Record<string, unknown>, permissions: Permission[]): Role {
  return {
    id: row.id as string,
    name: row.name as string,
    storeId: row.store_id as string | undefined,
    isSystem: row.is_system as boolean,
    permissions,
    createdAt: row.created_at as string,
  };
}

// Map camelCase action to snake_case DB column
const actionToColumn: Record<PermissionAction, string> = {
  canCreate: "can_create",
  canRead: "can_read",
  canUpdate: "can_update",
  canDelete: "can_delete",
};

export const useRolesStore = create<RolesState>()((set, get) => ({
  roles: [],
  searchQuery: "",
  isLoaded: false,

  fetchRoles: async () => {
    const supabase = createClient();

    // Fetch roles and permissions in parallel
    const [rolesRes, permsRes] = await Promise.all([
      supabase.from("roles").select("*").order("created_at", { ascending: true }),
      supabase.from("permissions").select("*"),
    ]);

    if (rolesRes.error) {
      console.error("Failed to fetch roles:", rolesRes.error.message);
      return;
    }
    if (permsRes.error) {
      console.error("Failed to fetch permissions:", permsRes.error.message);
      return;
    }
    if (rolesRes.data && permsRes.data) {
      const permsByRole = new Map<string, Permission[]>();
      for (const p of permsRes.data) {
        const mapped = mapPermission(p);
        const arr = permsByRole.get(mapped.roleId) || [];
        arr.push(mapped);
        permsByRole.set(mapped.roleId, arr);
      }

      const roles = rolesRes.data.map((r) =>
        mapRole(r, permsByRole.get(r.id as string) || [])
      );

      set({ roles, isLoaded: true });
    }
  },

  addRole: async (roleData) => {
    if (!roleData.name?.trim()) return;

    const roleResult = await dbInsertRole({
      name: roleData.name,
      store_id: roleData.storeId || null,
      is_system: roleData.isSystem,
    });

    if (!roleResult.success) {
      console.error("Failed to add role:", roleResult.error);
      return;
    }

    const roleRow = roleResult.data;

    // Insert permissions for all modules
    const permInserts = MODULES.map((mod) => {
      const existing = roleData.permissions.find((p) => p.module === mod);
      return {
        role_id: roleRow.id,
        module: mod,
        can_create: existing?.canCreate ?? false,
        can_read: existing?.canRead ?? false,
        can_update: existing?.canUpdate ?? false,
        can_delete: existing?.canDelete ?? false,
      };
    });

    const permsResult = await dbInsertPermissions(permInserts);
    const permissions = permsResult.success ? permsResult.data.map(mapPermission) : [];
    const newRole = mapRole(roleRow, permissions);

    set((state) => ({ roles: [...state.roles, newRole] }));
  },

  updateRole: async (id, updates) => {
    if (!id?.trim()) return;

    // Update role table fields
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.storeId !== undefined) dbUpdates.store_id = updates.storeId || null;

    if (Object.keys(dbUpdates).length > 0) {
      await dbUpdateRole(id, dbUpdates);
    }

    // If permissions are included, sync them to DB
    if (updates.permissions) {
      await dbDeletePermissionsByRole(id);

      const permInserts = updates.permissions.map((p) => ({
        role_id: id,
        module: p.module,
        can_create: p.canCreate,
        can_read: p.canRead,
        can_update: p.canUpdate,
        can_delete: p.canDelete,
      }));

      const permsResult = await dbInsertPermissions(permInserts);
      if (permsResult.success) {
        updates = { ...updates, permissions: permsResult.data.map(mapPermission) };
      }
    }

    set((state) => ({
      roles: state.roles.map((role) =>
        role.id === id ? { ...role, ...updates } : role
      ),
    }));
  },

  deleteRole: async (id) => {
    if (!id?.trim()) return;

    const result = await dbDeleteRole(id);
    if (!result.success) {
      console.error("Failed to delete role:", result.error);
      return;
    }
    set((state) => ({ roles: state.roles.filter((role) => role.id !== id) }));
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  togglePermission: async (roleId, module, action) => {
    const { roles } = get();
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const perm = role.permissions.find((p) => p.module === module);
    const newValue = perm ? !perm[action] : true;

    if (perm) {
      await dbUpdatePermission(perm.id, { [actionToColumn[action]]: newValue });
    } else {
      await dbInsertPermissions([{
        role_id: roleId,
        module,
        can_create: action === "canCreate",
        can_read: action === "canRead",
        can_update: action === "canUpdate",
        can_delete: action === "canDelete",
      }]);
    }

    // Update local state
    set((state) => ({
      roles: state.roles.map((r) => {
        if (r.id !== roleId) return r;

        const permIndex = r.permissions.findIndex((p) => p.module === module);
        if (permIndex === -1) {
          const newPerm: Permission = {
            id: `${roleId}-perm-${Date.now()}`,
            roleId,
            module,
            canCreate: false,
            canRead: false,
            canUpdate: false,
            canDelete: false,
            [action]: true,
          };
          return { ...r, permissions: [...r.permissions, newPerm] };
        }

        const updatedPermissions = r.permissions.map((p) =>
          p.module === module ? { ...p, [action]: !p[action] } : p
        );
        return { ...r, permissions: updatedPermissions };
      }),
    }));
  },

  filteredRoles: () => {
    const { roles, searchQuery } = get();
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(q) ||
        role.permissions.some((p) => p.module.toLowerCase().includes(q))
    );
  },
}));
