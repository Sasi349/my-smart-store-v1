"use client";

import { useState, useEffect } from "react";
import { useCustomersStore } from "@/stores/customers-store";
import { useAuthStore } from "@/stores/auth-store";
import type { Customer } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerFormDialog } from "@/components/modules/store/customer-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

const TYPE_BADGE_VARIANT: Record<
  Customer["type"],
  "default" | "secondary" | "outline"
> = {
  regular: "default",
  wholesale: "secondary",
  new: "outline",
};

const TYPE_LABELS: Record<Customer["type"], string> = {
  regular: "Regular",
  wholesale: "Wholesale",
  new: "New",
};

const TYPE_FILTER_LABELS: Record<string, string> = {
  all: "All Types",
  regular: "Regular",
  new: "New",
  wholesale: "Wholesale",
};

const SORT_LABELS: Record<string, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
  "name-asc": "Name A-Z",
  "name-desc": "Name Z-A",
};

export default function CustomersPage() {
  const { currentStore } = useAuthStore();
  const {
    searchQuery,
    typeFilter,
    sortBy,
    isLoaded,
    setSearchQuery,
    setTypeFilter,
    setSortBy,
    deleteCustomer,
    filteredCustomers,
    fetchCustomers,
  } = useCustomersStore();

  useEffect(() => {
    if (currentStore?.id && !isLoaded) {
      fetchCustomers(currentStore.id);
    }
  }, [currentStore?.id, isLoaded, fetchCustomers]);

  const customers = filteredCustomers();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(
    undefined
  );
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);

  const handleAdd = () => {
    setEditingCustomer(undefined);
    setFormOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteCustomer(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        title="Customers"
        count={customers.length}
        backHref="/store"
      >
        <Button
          onClick={handleAdd}
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Plus className="size-4" />
          Add Customer
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, mobile, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              if (val) {
                setTypeFilter(val as Customer["type"] | "all");
              }
            }}
          >
            <SelectTrigger>
              <SelectValue>{TYPE_FILTER_LABELS[typeFilter] ?? "All Types"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="wholesale">Wholesale</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(val) => {
              if (val) {
                setSortBy(
                  val as "name-asc" | "name-desc" | "newest" | "oldest"
                );
              }
            }}
          >
            <SelectTrigger>
              <SelectValue>{SORT_LABELS[sortBy] ?? "Sort"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Customer Cards Grid */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm">No customers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer) => (
            <Card key={customer.id} size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {customer.name}
                  <Badge variant={TYPE_BADGE_VARIANT[customer.type]}>
                    {TYPE_LABELS[customer.type]}
                  </Badge>
                </CardTitle>
                <CardAction>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-xs" />
                      }
                    >
                      <MoreVertical className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEdit(customer)}
                      >
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteConfirm(customer)}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0" />
                  <span>{customer.mobile}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* FAB for mobile */}
      <Button
        onClick={handleAdd}
        size="icon-lg"
        className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg sm:hidden"
      >
        <Plus className="size-5" />
      </Button>

      {/* Form Dialog */}
      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editingCustomer}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
