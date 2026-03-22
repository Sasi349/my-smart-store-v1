"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@/types";
import { useUsersStore } from "@/stores/users-store";
import { useAuthStore } from "@/stores/auth-store";
import { createAuthUser, updateAuthUserPassword } from "@/app/(admin)/admin/users/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const employeeFormSchema = (isEdit: boolean) =>
  z.object({
    name: z.string().min(1, "Name is required"),
    mobile: z
      .string()
      .regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),
    username: z
      .string()
      .min(1, "Username is required")
      .regex(/^[a-zA-Z0-9]+$/, "Username must be alphanumeric"),
    email: z.string().email("Valid email is required"),
    password: isEdit
      ? z.string().optional()
      : z.string().min(6, "Password must be at least 6 characters"),
    passcode: z
      .string()
      .regex(/^\d{6}$/, "Passcode must be exactly 6 digits")
      .or(z.literal(""))
      .optional(),
  });

type EmployeeFormValues = z.infer<ReturnType<typeof employeeFormSchema>>;

const EMPLOYEE_MODULES = [
  { key: "products", label: "Products", description: "View and manage products" },
  { key: "customers", label: "Customers", description: "View and manage customers" },
  { key: "receipts", label: "Receipts", description: "Create and view receipts" },
] as const;

type ModuleKey = (typeof EMPLOYEE_MODULES)[number]["key"];

interface ModuleAccess {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

type PermissionsState = Record<ModuleKey, ModuleAccess>;

const defaultPermissions: PermissionsState = {
  products: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
  customers: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
  receipts: { canRead: true, canCreate: true, canUpdate: false, canDelete: false },
};

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: User;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeFormDialogProps) {
  const isEdit = !!employee;
  const { updateUser, fetchUsers } = useUsersStore();
  const { currentStore } = useAuthStore();
  const [permissions, setPermissions] = useState<PermissionsState>(defaultPermissions);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema(isEdit)),
    defaultValues: {
      name: "",
      mobile: "",
      username: "",
      email: "",
      password: "",
      passcode: "",
    },
  });

  useEffect(() => {
    if (open) {
      setServerError(null);
      if (employee) {
        reset({
          name: employee.name,
          mobile: employee.mobile,
          username: employee.username,
          email: employee.email ?? "",
          password: "",
          passcode: "",
        });
        setPermissions(defaultPermissions);
      } else {
        reset({
          name: "",
          mobile: "",
          username: "",
          email: "",
          password: "",
          passcode: "",
        });
        setPermissions(defaultPermissions);
      }
    }
  }, [open, employee, reset]);

  function togglePermission(module: ModuleKey, action: keyof ModuleAccess) {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action],
      },
    }));
  }

  function toggleModuleAll(module: ModuleKey, enabled: boolean) {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        canRead: enabled,
        canCreate: enabled,
        canUpdate: enabled,
        canDelete: enabled,
      },
    }));
  }

  function hasAnyAccess(module: ModuleKey): boolean {
    const m = permissions[module];
    return m.canRead || m.canCreate || m.canUpdate || m.canDelete;
  }

  const onSubmit = async (data: EmployeeFormValues) => {
    setServerError(null);

    if (isEdit && employee) {
      // Update profile
      await updateUser(employee.id, {
        name: data.name,
        mobile: data.mobile,
        username: data.username,
        email: data.email || undefined,
      });

      // Update password if provided
      if (data.password) {
        const result = await updateAuthUserPassword(employee.id, data.password);
        if (!result.success) {
          setServerError(result.error || "Failed to update password");
          return;
        }
      }
    } else {
      // Create new employee via server action (creates auth user + profile)
      const result = await createAuthUser({
        email: data.email,
        password: data.password!,
        name: data.name,
        mobile: data.mobile,
        username: data.username,
        role: "employee",
        storeId: currentStore?.id,
        passcode: data.passcode || undefined,
      });

      if (!result.success) {
        setServerError(result.error || "Failed to create employee");
        return;
      }

      // Refresh users list from DB
      await fetchUsers();
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Employee" : "Add Employee"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update employee details and access permissions."
              : "Fill in the details and set access permissions."}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Personal Details Section */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal Details</p>

            {/* Name + Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="emp-name">Name *</Label>
                <Input id="emp-name" placeholder="Full name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="emp-mobile">Mobile *</Label>
                <Input id="emp-mobile" placeholder="10-digit number" {...register("mobile")} />
                {errors.mobile && <p className="text-xs text-destructive">{errors.mobile.message}</p>}
              </div>
            </div>

            {/* Username + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="emp-username">Username *</Label>
                <Input id="emp-username" placeholder="Alphanumeric" {...register("username")} />
                {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="emp-email">Email *</Label>
                <Input id="emp-email" type="email" placeholder="email@example.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Security</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="emp-password">Password {isEdit ? "" : "*"}</Label>
                <Input
                  id="emp-password"
                  type="password"
                  placeholder={isEdit ? "Unchanged" : "Min 6 chars"}
                  {...register("password")}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="emp-passcode">Passcode</Label>
                <Input
                  id="emp-passcode"
                  placeholder="6-digit (optional)"
                  maxLength={6}
                  {...register("passcode")}
                />
                {errors.passcode && <p className="text-xs text-destructive">{errors.passcode.message}</p>}
              </div>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="size-3.5 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access Permissions</p>
            </div>

            <div className="space-y-2">
              {EMPLOYEE_MODULES.map((mod) => {
                const active = hasAnyAccess(mod.key);
                return (
                  <div
                    key={mod.key}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      active ? "border-primary/30 bg-primary/5" : "bg-background"
                    )}
                  >
                    {/* Module toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{mod.label}</p>
                        <p className="text-[11px] text-muted-foreground">{mod.description}</p>
                      </div>
                      <Switch
                        checked={active}
                        onCheckedChange={(checked) => toggleModuleAll(mod.key, checked)}
                      />
                    </div>

                    {/* CRUD toggles */}
                    {active && (
                      <div className="grid grid-cols-4 gap-1.5 mt-2.5 pt-2.5 border-t border-border/50">
                        {(
                          [
                            { key: "canRead", label: "View" },
                            { key: "canCreate", label: "Create" },
                            { key: "canUpdate", label: "Edit" },
                            { key: "canDelete", label: "Delete" },
                          ] as const
                        ).map((action) => {
                          const checked = permissions[mod.key][action.key];
                          return (
                            <button
                              key={action.key}
                              type="button"
                              onClick={() => togglePermission(mod.key, action.key)}
                              className={cn(
                                "flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                                checked
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
                              )}
                            >
                              <div className={cn(
                                "size-2 rounded-full transition-colors",
                                checked ? "bg-primary" : "bg-muted-foreground/30"
                              )} />
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Update Employee" : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
