"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Customer } from "@/types";
import { useCustomersStore } from "@/stores/customers-store";
import { useAuthStore } from "@/stores/auth-store";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z
    .string()
    .regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),
  email: z
    .string()
    .email("Invalid email address")
    .or(z.literal(""))
    .optional(),
  type: z.enum(["regular", "new", "wholesale"], "Customer type is required"),
  address: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  readOnly?: boolean;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  readOnly = false,
}: CustomerFormDialogProps) {
  const isEdit = !!customer;
  const { addCustomer, updateCustomer } = useCustomersStore();
  const { currentStore } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      type: undefined,
      address: "",
    },
  });

  const watchedType = watch("type");

  useEffect(() => {
    if (open) {
      if (customer) {
        reset({
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email ?? "",
          type: customer.type,
          address: customer.address ?? "",
        });
      } else {
        reset({
          name: "",
          mobile: "",
          email: "",
          type: undefined,
          address: "",
        });
      }
    }
  }, [open, customer, reset]);

  const onSubmit = async (data: CustomerFormValues) => {
    if (isEdit && customer) {
      await updateCustomer(customer.id, {
        name: data.name,
        mobile: data.mobile,
        email: data.email || undefined,
        type: data.type,
        address: data.address || undefined,
      });
    } else {
      await addCustomer({
        storeId: currentStore?.id ?? "",
        name: data.name,
        mobile: data.mobile,
        email: data.email || undefined,
        type: data.type,
        address: data.address || undefined,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? "View Customer" : isEdit ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "Customer details (read-only)."
              : isEdit
              ? "Update the customer details below."
              : "Fill in the details to add a new customer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
          <fieldset disabled={readOnly} className="contents">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="customer-name">Name *</Label>
            <Input
              id="customer-name"
              placeholder="Full name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Mobile */}
          <div className="grid gap-1.5">
            <Label htmlFor="customer-mobile">Mobile *</Label>
            <Input
              id="customer-mobile"
              placeholder="10-digit mobile number"
              {...register("mobile")}
            />
            {errors.mobile && (
              <p className="text-xs text-destructive">
                {errors.mobile.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="grid gap-1.5">
            <Label htmlFor="customer-email">Email</Label>
            <Input
              id="customer-email"
              type="email"
              placeholder="customer@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Type */}
          <div className="grid gap-1.5">
            <Label>Type *</Label>
            <Select
              value={watchedType ?? ""}
              onValueChange={(val) => {
                if (val) {
                  setValue("type", val as Customer["type"], {
                    shouldValidate: true,
                  });
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="grid gap-1.5">
            <Label htmlFor="customer-address">Address</Label>
            <Textarea
              id="customer-address"
              placeholder="Customer address"
              {...register("address")}
            />
            {errors.address && (
              <p className="text-xs text-destructive">
                {errors.address.message}
              </p>
            )}
          </div>

          </fieldset>
          <DialogFooter>
            {readOnly ? (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? "Update Customer" : "Add Customer"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
