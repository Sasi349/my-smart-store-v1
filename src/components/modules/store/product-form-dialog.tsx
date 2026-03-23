"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Product } from "@/types";
import { UNITS } from "@/types";
import { useProductsStore } from "@/stores/products-store";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  barcode: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().positive("Price must be positive"),
  purchasePrice: z.coerce.number().positive("Purchase price must be positive"),
  offerType: z.enum(["flat", "percentage", ""], "Select an offer type").optional(),
  offerPrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  unit: z.enum(UNITS, "Select a unit"),
  pictureUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  readOnly?: boolean;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  readOnly = false,
}: ProductFormDialogProps) {
  const { addProduct, updateProduct, categories } = useProductsStore();
  const { currentStore } = useAuthStore();
  const existingCategories = categories();
  const isEditing = !!product;

  const form = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: "",
      barcode: "",
      category: "",
      price: 0,
      purchasePrice: 0,
      offerType: "",
      offerPrice: 0,
      stock: 0,
      unit: "piece",
      pictureUrl: "",
    },
  });

  const watchOfferType = form.watch("offerType");

  useEffect(() => {
    if (open) {
      if (product) {
        form.reset({
          name: product.name,
          barcode: product.barcode ?? "",
          category: product.category,
          price: product.price,
          purchasePrice: product.purchasePrice,
          offerType: product.offerType ?? "",
          offerPrice: product.offerPrice ?? 0,
          stock: product.stock,
          unit: product.unit as ProductFormValues["unit"],
          pictureUrl: product.pictureUrl ?? "",
        });
      } else {
        form.reset({
          name: "",
          barcode: "",
          category: "",
          price: 0,
          purchasePrice: 0,
          offerType: "",
          offerPrice: 0,
          stock: 0,
          unit: "piece",
          pictureUrl: "",
        });
      }
    }
  }, [open, product, form]);

  async function onSubmit(values: ProductFormValues) {
    const offerType =
      values.offerType === "" ? undefined : values.offerType;
    const offerPrice =
      offerType && values.offerPrice ? values.offerPrice : undefined;

    if (isEditing && product) {
      await updateProduct(product.id, {
        name: values.name,
        barcode: values.barcode || undefined,
        category: values.category,
        price: values.price,
        purchasePrice: values.purchasePrice,
        offerType,
        offerPrice,
        stock: values.stock,
        unit: values.unit,
        pictureUrl: values.pictureUrl || undefined,
      });
    } else {
      await addProduct({
        storeId: currentStore?.id ?? "",
        name: values.name,
        barcode: values.barcode || undefined,
        category: values.category,
        price: values.price,
        purchasePrice: values.purchasePrice,
        offerType,
        offerPrice,
        stock: values.stock,
        unit: values.unit,
        pictureUrl: values.pictureUrl || undefined,
      });
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? "View Product" : isEditing ? "Edit Product" : "Add Product"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "Product details (read-only)."
              : isEditing
              ? "Update the product details below."
              : "Fill in the details to add a new product."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <fieldset disabled={readOnly} className="contents">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Product name"
              {...form.register("name")}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Barcode */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              placeholder="Barcode (optional)"
              {...form.register("barcode")}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              placeholder="Category"
              list="category-options"
              {...form.register("category")}
              aria-invalid={!!form.formState.errors.category}
            />
            <datalist id="category-options">
              {existingCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
            {form.formState.errors.category && (
              <p className="text-xs text-destructive">
                {form.formState.errors.category.message}
              </p>
            )}
          </div>

          {/* Price & Purchase Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("price")}
                aria-invalid={!!form.formState.errors.price}
              />
              {form.formState.errors.price && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.price.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purchasePrice">Purchase Price *</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("purchasePrice")}
                aria-invalid={!!form.formState.errors.purchasePrice}
              />
              {form.formState.errors.purchasePrice && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.purchasePrice.message}
                </p>
              )}
            </div>
          </div>

          {/* Offer Type & Offer Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Offer Type</Label>
              <Select
                value={watchOfferType ?? ""}
                onValueChange={(val: string | null) => {
                  form.setValue("offerType", (val ?? "") as ProductFormValues["offerType"]);
                  if (!val) {
                    form.setValue("offerPrice", 0);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No offer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No offer</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {watchOfferType && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="offerPrice">
                  Offer {watchOfferType === "percentage" ? "(%)" : "Price"}
                </Label>
                <Input
                  id="offerPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("offerPrice")}
                  aria-invalid={!!form.formState.errors.offerPrice}
                />
                {form.formState.errors.offerPrice && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.offerPrice.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Stock & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock">Stock *</Label>
              <Input
                id="stock"
                type="number"
                step="1"
                placeholder="0"
                {...form.register("stock")}
                aria-invalid={!!form.formState.errors.stock}
              />
              {form.formState.errors.stock && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.stock.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unit *</Label>
              <Select
                value={form.watch("unit")}
                onValueChange={(val: string | null) => {
                  if (val) {
                    form.setValue("unit", val as ProductFormValues["unit"]);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.unit && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.unit.message}
                </p>
              )}
            </div>
          </div>


          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button type="submit">
                {isEditing ? "Save Changes" : "Add Product"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
