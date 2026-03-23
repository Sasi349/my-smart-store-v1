"use client";

import { useState, useEffect } from "react";
import type { User } from "@/types";
import { useAuthStore } from "@/stores/auth-store";
import { useUsersStore } from "@/stores/users-store";
import { EmployeeFormDialog } from "@/components/modules/store/employee-form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
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
import { usePermissions } from "@/hooks/use-permissions";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Phone,
  ShieldX,
} from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function EmployeesPage() {
  const { currentStore } = useAuthStore();
  const { users, isLoaded, deleteUser, fetchUsers } = useUsersStore();
  const { isAdmin, isLoaded: permLoaded } = usePermissions();

  useEffect(() => {
    if (!isLoaded) fetchUsers();
  }, [isLoaded, fetchUsers]);

  // Only admins can manage employees
  if (permLoaded && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ShieldX className="size-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="text-xs mt-1">Only store admins can manage employees.</p>
      </div>
    );
  }

  const employees = users.filter(
    (u) => u.role === "employee" && u.storeId === currentStore?.id
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | undefined>(
    undefined
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<User | null>(null);

  const handleAdd = () => {
    setEditingEmployee(undefined);
    setFormOpen(true);
  };

  const handleEdit = (employee: User) => {
    setEditingEmployee(employee);
    setFormOpen(true);
  };

  const handleDeleteConfirm = (employee: User) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (employeeToDelete) {
      deleteUser(employeeToDelete.id);
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 sm:pb-4">
      {/* Header */}
      <PageHeader title="Employees" count={employees.length} backHref="/store">
        <Button onClick={handleAdd} className="hidden sm:inline-flex">
          <Plus className="size-4" data-icon="inline-start" />
          Add Employee
        </Button>
      </PageHeader>

      {/* Employee Cards Grid */}
      {employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <p className="text-sm">No employees found.</p>
          <p className="mt-1 text-xs">
            Add employees to manage your store staff.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onEdit={handleEdit}
              onDelete={handleDeleteConfirm}
            />
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

      {/* Form Dialog */}
      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editingEmployee}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {employeeToDelete?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeCard({
  employee,
  onEdit,
  onDelete,
}: {
  employee: User;
  onEdit: (employee: User) => void;
  onDelete: (employee: User) => void;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {getInitials(employee.name)}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">
                {employee.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{employee.username}
              </p>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-xs" />
                }
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem onClick={() => onEdit(employee)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(employee)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Role Badge */}
          <div className="mt-1.5">
            <Badge variant="secondary">Employee</Badge>
          </div>

          {/* Details */}
          <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Phone className="size-3 shrink-0" />
              <span>{employee.mobile}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
