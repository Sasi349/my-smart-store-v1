"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Store } from "@/types";
import { STORE_TYPES } from "@/types";
import { useStoresStore } from "@/stores/stores-store";
import { useUsersStore } from "@/stores/users-store";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const storeFormSchema = z.object({
  shopname: z.string().min(1, "Shop name is required"),
  adminId: z.string().min(1, "Shop admin is required"),
  location: z.string().min(1, "Location is required"),
  type: z.string().min(1, "Store type is required"),
});

type StoreFormValues = z.infer<typeof storeFormSchema>;

interface StoreFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store?: Store | null;
}

export function StoreFormDialog({
  open,
  onOpenChange,
  store,
}: StoreFormDialogProps) {
  const { stores, addStore, updateStore } = useStoresStore();
  const { users } = useUsersStore();
  const isEditing = !!store;

  const availableAdmins = useMemo(() => {
    const shopAdmins = users.filter((u) => u.role === "shop_admin");
    const assignedAdminIds = stores
      .filter((s) => s.id !== store?.id)
      .map((s) => s.adminId);
    return shopAdmins.filter(
      (u) => !assignedAdminIds.includes(u.id) || u.id === store?.adminId
    );
  }, [stores, store]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      shopname: "",
      adminId: "",
      location: "",
      type: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (store) {
        reset({
          shopname: store.shopname,
          adminId: store.adminId,
          location: store.location,
          type: store.type,
        });
      } else {
        reset({
          shopname: "",
          adminId: "",
          location: "",
          type: "",
        });
      }
    }
  }, [open, store, reset]);

  const onSubmit = async (values: StoreFormValues) => {
    if (isEditing && store) {
      await updateStore(store.id, values);
    } else {
      await addStore({
        shopname: values.shopname,
        adminId: values.adminId,
        location: values.location,
        type: values.type,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Store" : "Add Store"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the store details below."
              : "Fill in the details to create a new store."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          {/* Shop Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="shopname">Shop Name</Label>
            <Input
              id="shopname"
              placeholder="Enter shop name"
              {...register("shopname")}
              aria-invalid={!!errors.shopname}
            />
            {errors.shopname && (
              <p className="text-xs text-destructive">
                {errors.shopname.message}
              </p>
            )}
          </div>

          {/* Shop Admin */}
          <div className="grid gap-1.5">
            <Label htmlFor="adminId">Shop Admin</Label>
            <Controller
              name="adminId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-invalid={!!errors.adminId}>
                    <SelectValue placeholder="Select an admin">
                      {availableAdmins.find((u) => u.id === field.value)?.name ?? "Select an admin"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableAdmins.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                    {availableAdmins.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No available admins
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.adminId && (
              <p className="text-xs text-destructive">
                {errors.adminId.message}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="grid gap-1.5">
            <Label htmlFor="location">Location</Label>
            <Textarea
              id="location"
              placeholder="Enter store address"
              {...register("location")}
              aria-invalid={!!errors.location}
            />
            {errors.location && (
              <p className="text-xs text-destructive">
                {errors.location.message}
              </p>
            )}
          </div>

          {/* Type */}
          <div className="grid gap-1.5">
            <Label htmlFor="type">Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-invalid={!!errors.type}>
                    <SelectValue placeholder="Select store type" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-xs text-destructive">
                {errors.type.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEditing ? "Update Store" : "Create Store"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
