"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Globe,
  Store,
  Shield,
  MoreVertical,
} from "lucide-react";

import type { Role } from "@/types";
import { MODULES } from "@/types";
import { useRolesStore } from "@/stores/roles-store";
import { useStoresStore } from "@/stores/stores-store";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RoleFormDialog } from "@/components/modules/admin/role-form-dialog";

const ACTION_LABELS = [
  { key: "canCreate" as const, label: "C" },
  { key: "canRead" as const, label: "R" },
  { key: "canUpdate" as const, label: "U" },
  { key: "canDelete" as const, label: "D" },
];

function getModulesWithAccess(role: Role): number {
  return role.permissions.filter(
    (p) => p.canCreate || p.canRead || p.canUpdate || p.canDelete
  ).length;
}

export default function RolesPage() {
  const { searchQuery, isLoaded, setSearchQuery, filteredRoles, togglePermission, deleteRole, fetchRoles } =
    useRolesStore();
  const { stores, isLoaded: storesLoaded, fetchStores } = useStoresStore();

  useEffect(() => {
    if (!isLoaded) fetchRoles();
    if (!storesLoaded) fetchStores();
  }, [isLoaded, storesLoaded, fetchRoles, fetchStores]);

  function getStoreName(storeId?: string): string {
    if (!storeId) return "Global";
    return stores.find((s) => s.id === storeId)?.shopname ?? "Unknown";
  }

  const roles = filteredRoles();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = () => { setEditingRole(null); setDialogOpen(true); };
  const handleEdit = (role: Role) => { setEditingRole(role); setDialogOpen(true); };
  const handleDeleteConfirm = async () => {
    if (deleteTarget) { await deleteRole(deleteTarget.id); setDeleteTarget(null); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Roles & Permissions" count={roles.length} backHref="/admin">
        <Button onClick={handleAdd} className="hidden sm:inline-flex">
          <Plus className="size-4" />
          Add Role
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search roles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Cards */}
      {roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <Shield className="mb-3 size-8 opacity-40" />
          <p className="text-sm">No roles found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const expanded = expandedIds.has(role.id);
            const moduleCount = getModulesWithAccess(role);

            return (
              <div
                key={role.id}
                className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30"
              >
                {/* Top row */}
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Shield className="size-5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Name row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{role.name}</p>
                          {role.isSystem && (
                            <Badge variant="outline" className="text-[10px]">System</Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(role)}>
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={role.isSystem}
                            onClick={() => !role.isSystem && setDeleteTarget(role)}
                          >
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Meta */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        {role.storeId ? (
                          <><Store className="size-3 shrink-0" /><span>{getStoreName(role.storeId)}</span></>
                        ) : (
                          <><Globe className="size-3 shrink-0" /><span>Global</span></>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>{moduleCount} module{moduleCount !== 1 ? "s" : ""} with access</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  type="button"
                  onClick={() => toggleExpand(role.id)}
                  className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
                >
                  <span>{expanded ? "Hide" : "Show"} permissions</span>
                  {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>

                {/* Permission matrix */}
                {expanded && (
                  <div className="animate-in fade-in-0 slide-in-from-top-1 duration-150">
                    {/* Desktop table */}
                    <div className="hidden sm:block rounded-lg border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-2.5 py-1.5 text-left font-medium">Module</th>
                            {ACTION_LABELS.map((a) => (
                              <th key={a.key} className="px-2 py-1.5 text-center font-medium w-10">{a.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {MODULES.map((mod) => {
                            const perm = role.permissions.find((p) => p.module === mod);
                            return (
                              <tr key={mod} className="border-b last:border-b-0">
                                <td className="px-2.5 py-1.5 capitalize">{mod}</td>
                                {ACTION_LABELS.map((a) => (
                                  <td key={a.key} className="px-2 py-1.5 text-center">
                                    <Switch
                                      size="sm"
                                      checked={perm?.[a.key] ?? false}
                                      onCheckedChange={() => togglePermission(role.id, mod, a.key)}
                                    />
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-2">
                      {MODULES.map((mod) => {
                        const perm = role.permissions.find((p) => p.module === mod);
                        return (
                          <div key={mod} className="rounded-lg border p-2.5 space-y-1.5">
                            <p className="text-xs font-medium capitalize">{mod}</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {ACTION_LABELS.map((a) => (
                                <label
                                  key={a.key}
                                  className="flex items-center justify-between gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-[10px]"
                                >
                                  <span>
                                    {a.key === "canCreate" ? "Create" : a.key === "canRead" ? "Read" : a.key === "canUpdate" ? "Update" : "Delete"}
                                  </span>
                                  <Switch
                                    size="sm"
                                    checked={perm?.[a.key] ?? false}
                                    onCheckedChange={() => togglePermission(role.id, mod, a.key)}
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile FAB */}
      <Button
        size="icon-lg"
        onClick={handleAdd}
        className="fixed bottom-20 right-4 z-40 size-12 rounded-full shadow-lg sm:hidden"
      >
        <Plus className="size-5" />
      </Button>

      <RoleFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editingRole={editingRole} />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
