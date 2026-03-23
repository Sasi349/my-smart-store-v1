"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@/types";
import { useUsersStore } from "@/stores/users-store";
import { useAuthStore } from "@/stores/auth-store";
import { useRolesStore } from "@/stores/roles-store";
import { createAuthUser, updateUserProfile, updateAuthUserPassword } from "@/app/(admin)/admin/users/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

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
  const { fetchUsers } = useUsersStore();
  const { currentStore } = useAuthStore();
  const { roles, isLoaded: rolesLoaded, fetchRoles } = useRolesStore();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch roles if not loaded
  useEffect(() => {
    if (!rolesLoaded) fetchRoles();
  }, [rolesLoaded, fetchRoles]);

  // Filter roles that are available for this store (store-scoped or global)
  const availableRoles = roles.filter(
    (r) => !r.storeId || r.storeId === currentStore?.id
  );

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema(isEdit)) as any,
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
        setSelectedRoleId(employee.roleId || "");
      } else {
        reset({
          name: "",
          mobile: "",
          username: "",
          email: "",
          password: "",
          passcode: "",
        });
        setSelectedRoleId("");
      }
    }
  }, [open, employee, reset]);

  const onSubmit = async (data: EmployeeFormValues) => {
    setServerError(null);

    if (!selectedRoleId) {
      setServerError("Please select a role for the employee");
      return;
    }

    if (isEdit && employee) {
      // Update profile via server action (bypasses RLS)
      const profileResult = await updateUserProfile(employee.id, {
        name: data.name,
        mobile: data.mobile,
        username: data.username,
        email: data.email || undefined,
        roleId: selectedRoleId,
      });

      if (!profileResult.success) {
        setServerError(profileResult.error || "Failed to update employee");
        return;
      }

      // Update password if provided
      if (data.password) {
        const result = await updateAuthUserPassword(employee.id, data.password);
        if (!result.success) {
          setServerError(result.error || "Failed to update password");
          return;
        }
      }

      // Refresh users list
      await fetchUsers();
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
        roleId: selectedRoleId,
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
              ? "Update employee details and assigned role."
              : "Fill in the details and assign a role."}
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

          {/* Role Assignment Section */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="size-3.5 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role & Permissions</p>
            </div>

            <div className="grid gap-1.5">
              <Label>Assign Role *</Label>
              <Select
                value={selectedRoleId}
                onValueChange={(val: string | null) => {
                  if (val) setSelectedRoleId(val);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role...">{selectedRole?.name ?? "Select a role..."}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}{role.storeId ? "" : " (Global)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableRoles.length === 0 && (
                <p className="text-xs text-muted-foreground">No roles available. Create roles in Admin &gt; Roles first.</p>
              )}
            </div>

            {/* Show selected role's permissions as preview */}
            {selectedRole && selectedRole.permissions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Permissions for this role:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRole.permissions
                    .filter((p) => p.canRead || p.canCreate || p.canUpdate || p.canDelete)
                    .map((p) => {
                      const actions = [
                        p.canRead && "R",
                        p.canCreate && "C",
                        p.canUpdate && "U",
                        p.canDelete && "D",
                      ].filter(Boolean).join("");
                      return (
                        <Badge key={p.module} variant="secondary" className="text-[10px]">
                          {p.module}: {actions}
                        </Badge>
                      );
                    })}
                </div>
              </div>
            )}
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
