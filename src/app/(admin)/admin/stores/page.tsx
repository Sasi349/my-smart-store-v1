"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { STORE_TYPES } from "@/types";
import type { Store } from "@/types";
import { useStoresStore } from "@/stores/stores-store";
import { useUsersStore } from "@/stores/users-store";
import { useAuthStore } from "@/stores/auth-store";
import { StoreFormDialog } from "@/components/modules/admin/store-form-dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuSeparator,
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
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  User,
  MoreVertical,
} from "lucide-react";

const STORE_TYPE_FILTER_LABELS: Record<string, string> = {
  all: "All Types",
  ...Object.fromEntries(STORE_TYPES.map((t) => [t, t])),
};

export default function StoresPage() {
  const router = useRouter();
  const { searchQuery, typeFilter, isLoaded, setSearchQuery, setTypeFilter, deleteStore, filteredStores, fetchStores } =
    useStoresStore();
  const { setCurrentStore, setImpersonating } = useAuthStore();
  const { users, fetchUsers, isLoaded: usersLoaded } = useUsersStore();
  const stores = filteredStores();

  useEffect(() => {
    if (!isLoaded) fetchStores();
    if (!usersLoaded) fetchUsers();
  }, [isLoaded, usersLoaded, fetchStores, fetchUsers]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);

  const adminMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.id, u.name));
    return map;
  }, []);

  const handleAdd = () => { setEditingStore(null); setFormOpen(true); };
  const handleEdit = (store: Store) => { setEditingStore(store); setFormOpen(true); };
  const handleDeleteConfirm = () => {
    if (deleteTarget) { deleteStore(deleteTarget.id); setDeleteTarget(null); }
  };
  const handleGoToStore = (store: Store) => {
    setCurrentStore(store); setImpersonating(true); router.push("/store");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Stores" count={stores.length} backHref="/admin">
        <Button onClick={handleAdd} className="hidden sm:inline-flex">
          <Plus className="size-4" />
          Add Store
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search stores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter || "all"} onValueChange={(val) => setTypeFilter(!val || val === "all" ? "" : val)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>{STORE_TYPE_FILTER_LABELS[typeFilter || "all"] ?? "All Types"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {STORE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      {stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <p className="text-sm">No stores found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <div
              key={store.id}
              className="group relative flex flex-col rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30"
            >
              {/* Top section */}
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {store.shopname.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Name row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{store.shopname}</p>
                      <Badge variant="outline" className="mt-0.5 text-[10px]">{store.type}</Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(store)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(store)}>
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Meta */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="size-3 shrink-0" />
                    <span>{adminMap.get(store.adminId) || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{store.location}</span>
                  </div>
                </div>
              </div>
              </div>

              {/* Go to Store button */}
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={() => handleGoToStore(store)}
              >
                <ExternalLink className="size-3.5" />
                Go to Store
              </Button>
            </div>
          ))}
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

      <StoreFormDialog open={formOpen} onOpenChange={setFormOpen} store={editingStore} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Store</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.shopname}</span>? This action cannot be undone.
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
