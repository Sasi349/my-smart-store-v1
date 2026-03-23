"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User, UserRole } from "@/types";
import { useUsersStore } from "@/stores/users-store";
import { useStoresStore } from "@/stores/stores-store";
import { createAuthUser, updateUserProfile, updateUserPasscode, updateAuthUserPassword } from "@/app/(admin)/admin/users/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const userFormSchema = (isEdit: boolean) =>
  z.object({
    name: z.string().min(1, "Name is required"),
    mobile: z
      .string()
      .regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),
    username: z
      .string()
      .min(1, "Username is required")
      .regex(/^[a-zA-Z0-9]+$/, "Username must be alphanumeric"),
    email: z
      .string()
      .email("Invalid email address")
      .min(1, "Email is required"),
    role: z.enum(["super_admin", "shop_admin", "employee"], "Role is required"),
    password: isEdit
      ? z.string().optional()
      : z.string().min(6, "Password must be at least 6 characters"),
    passcode: z
      .string()
      .regex(/^\d{6}$/, "Passcode must be exactly 6 digits")
      .or(z.literal(""))
      .optional(),
    storeId: z.string().optional(),
  });

type UserFormValues = z.infer<ReturnType<typeof userFormSchema>>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
}: UserFormDialogProps) {
  const isEdit = !!user;
  const { fetchUsers } = useUsersStore();
  const { stores } = useStoresStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema(isEdit)),
    defaultValues: {
      name: "",
      mobile: "",
      username: "",
      email: "",
      role: undefined,
      password: "",
      passcode: "",
      storeId: "",
    },
  });

  const watchedRole = watch("role");
  const showStoreSelect = watchedRole === "shop_admin" || watchedRole === "employee";

  useEffect(() => {
    if (open) {
      setServerError(null);
      if (user) {
        reset({
          name: user.name,
          mobile: user.mobile,
          username: user.username,
          email: user.email ?? "",
          role: user.role,
          password: "",
          passcode: "",
          storeId: user.storeId ?? "",
        });
      } else {
        reset({
          name: "",
          mobile: "",
          username: "",
          email: "",
          role: undefined,
          password: "",
          passcode: "",
          storeId: "",
        });
      }
    }
  }, [open, user, reset]);

  const onSubmit = async (data: UserFormValues) => {
    setServerError(null);

    if (isEdit && user) {
      // Update profile via server action (bypasses RLS)
      const profileResult = await updateUserProfile(user.id, {
        name: data.name,
        mobile: data.mobile,
        username: data.username,
        email: data.email || undefined,
        role: data.role as string,
        storeId: showStoreSelect ? data.storeId || undefined : undefined,
      });

      if (!profileResult.success) {
        setServerError(profileResult.error || "Failed to update user");
        return;
      }

      // Update passcode if provided
      if (data.passcode) {
        const passcodeResult = await updateUserPasscode(user.id, data.passcode);
        if (!passcodeResult.success) {
          setServerError(passcodeResult.error || "Failed to update passcode");
          return;
        }
      }

      // Update password if provided
      if (data.password) {
        const result = await updateAuthUserPassword(user.id, data.password);
        if (!result.success) {
          setServerError(result.error || "Failed to update password");
          return;
        }
      }

      // Refresh users list
      await fetchUsers();
    } else {
      // Create new auth user via server action
      const result = await createAuthUser({
        email: data.email!,
        password: data.password!,
        name: data.name,
        mobile: data.mobile,
        username: data.username,
        role: data.role as string,
        storeId: showStoreSelect ? data.storeId || undefined : undefined,
        passcode: data.passcode || undefined,
      });

      if (!result.success) {
        setServerError(result.error || "Failed to create user");
        return;
      }

      // Refresh users list from DB
      await fetchUsers();
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the user details below."
              : "Fill in the details to create a new user."}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="Full name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Mobile */}
          <div className="grid gap-1.5">
            <Label htmlFor="mobile">Mobile *</Label>
            <Input
              id="mobile"
              placeholder="10-digit mobile number"
              {...register("mobile")}
            />
            {errors.mobile && (
              <p className="text-xs text-destructive">
                {errors.mobile.message}
              </p>
            )}
          </div>

          {/* Username */}
          <div className="grid gap-1.5">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="Alphanumeric username"
              {...register("username")}
            />
            {errors.username && (
              <p className="text-xs text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Role */}
          <div className="grid gap-1.5">
            <Label>Role *</Label>
            <Select
              value={watchedRole ?? ""}
              onValueChange={(val) =>
                val && setValue("role", val as UserRole, { shouldValidate: true })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="shop_admin">Shop Admin</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-xs text-destructive">
                {errors.role.message}
              </p>
            )}
          </div>

          {/* Store (conditional) */}
          {showStoreSelect && (
            <div className="grid gap-1.5">
              <Label>Store</Label>
              <Select
                value={watch("storeId") ?? ""}
                onValueChange={(val) =>
                  setValue("storeId", val ?? "", { shouldValidate: true })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select store">
                    {stores.find((s) => s.id === watch("storeId"))?.shopname ?? "Select store"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.shopname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Password */}
          <div className="grid gap-1.5">
            <Label htmlFor="password">
              Password {isEdit ? "" : "*"}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={isEdit ? "Leave blank to keep unchanged" : "Min 6 characters"}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Passcode */}
          <div className="grid gap-1.5">
            <Label htmlFor="passcode">Passcode</Label>
            <Input
              id="passcode"
              placeholder="6-digit passcode (optional)"
              maxLength={6}
              {...register("passcode")}
            />
            {errors.passcode && (
              <p className="text-xs text-destructive">
                {errors.passcode.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
