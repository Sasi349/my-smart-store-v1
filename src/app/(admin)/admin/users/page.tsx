"use client";

import { useState, useEffect } from "react";
import type { User, UserRole } from "@/types";
import { useUsersStore } from "@/stores/users-store";
import { useStoresStore } from "@/stores/stores-store";
import { deleteAuthUser } from "./actions";
import { UserFormDialog } from "@/components/modules/admin/user-form-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Search,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Store,
} from "lucide-react";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  shop_admin: "Shop Admin",
  employee: "Employee",
};

const ROLE_FILTER_LABELS: Record<string, string> = {
  all: "All Roles",
  super_admin: "Super Admin",
  shop_admin: "Shop Admin",
  employee: "Employee",
};

const ROLE_BADGE_VARIANT: Record<UserRole, "destructive" | "default" | "secondary"> = {
  super_admin: "destructive",
  shop_admin: "default",
  employee: "secondary",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function UsersPage() {
  const { searchQuery, roleFilter, isLoaded, setSearchQuery, setRoleFilter, filteredUsers, deleteUser, fetchUsers } =
    useUsersStore();
  const { stores, isLoaded: storesLoaded, fetchStores } = useStoresStore();

  useEffect(() => {
    if (!isLoaded) fetchUsers();
    if (!storesLoaded) fetchStores();
  }, [isLoaded, storesLoaded, fetchUsers, fetchStores]);

  function getStoreName(storeId?: string) {
    if (!storeId) return null;
    return stores.find((s) => s.id === storeId)?.shopname ?? null;
  }

  const users = filteredUsers();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleAdd = () => { setEditingUser(undefined); setFormOpen(true); };
  const handleEdit = (user: User) => { setEditingUser(user); setFormOpen(true); };
  const handleDeleteConfirm = (user: User) => { setUserToDelete(user); setDeleteDialogOpen(true); };
  const handleDelete = async () => {
    if (userToDelete) {
      await deleteAuthUser(userToDelete.id);
      deleteUser(userToDelete.id);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Users" count={users.length} backHref="/admin">
        <Button onClick={handleAdd} className="hidden sm:inline-flex">
          <Plus className="size-4" />
          Add User
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={roleFilter} onValueChange={(val) => setRoleFilter((val ?? "all") as UserRole | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>{ROLE_FILTER_LABELS[roleFilter] ?? "All Roles"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="shop_admin">Shop Admin</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <p className="text-sm">No users found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => {
            const storeName = getStoreName(user.storeId);
            return (
              <div
                key={user.id}
                className="group relative flex gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30"
              >
                {/* Avatar */}
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {getInitials(user.name)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Name row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => handleDeleteConfirm(user)}>
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badge */}
                  <Badge variant={ROLE_BADGE_VARIANT[user.role]}>{ROLE_LABELS[user.role]}</Badge>

                  {/* Meta */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3 shrink-0" />
                      <span>{user.mobile}</span>
                    </div>
                    {user.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    )}
                    {storeName && (
                      <div className="flex items-center gap-1.5">
                        <Store className="size-3 shrink-0" />
                        <span className="truncate">{storeName}</span>
                      </div>
                    )}
                  </div>
                </div>
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

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{userToDelete?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
