"use client";

import { useState, useEffect } from "react";
import { useProductsStore } from "@/stores/products-store";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/layout/page-header";
import { ProductFormDialog } from "@/components/modules/store/product-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Product } from "@/types";

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  name: "Name",
  price: "Price",
  stock: "Stock",
};

export default function ProductsPage() {
  const { currentStore } = useAuthStore();
  const {
    searchQuery,
    categoryFilter,
    sortBy,
    isLoaded,
    setSearchQuery,
    setCategoryFilter,
    setSortBy,
    filteredProducts,
    categories,
    deleteProduct,
    fetchProducts,
  } = useProductsStore();

  useEffect(() => {
    if (currentStore?.id && !isLoaded) {
      fetchProducts(currentStore.id);
    }
  }, [currentStore?.id, isLoaded, fetchProducts]);

  const products = filteredProducts();
  const allCategories = categories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  function handleCreate() {
    setEditingProduct(null);
    setDialogOpen(true);
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setDialogOpen(true);
  }

  function handleDeleteConfirm() {
    if (deleteTarget) {
      deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  function getStockColor(stock: number) {
    if (stock === 0) return "text-red-600 bg-red-50 dark:bg-red-950/30";
    if (stock <= 10) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30";
    return "text-green-600 bg-green-50 dark:bg-green-950/30";
  }

  function getDisplayPrice(product: Product) {
    if (!product.offerType || product.offerPrice == null) {
      return { final: product.price, hasOffer: false };
    }
    if (product.offerType === "percentage") {
      const discounted = product.price * (1 - product.offerPrice / 100);
      return { final: Math.round(discounted * 100) / 100, hasOffer: true };
    }
    // flat
    return { final: product.offerPrice, hasOffer: true };
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="Products" count={products.length} backHref="/store">
        <Button size="sm" onClick={handleCreate} className="hidden sm:flex">
          <Plus className="size-4" data-icon="inline-start" />
          Add Product
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(val: string | null) => setCategoryFilter(val ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>{categoryFilter === "all" ? "All Categories" : categoryFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(val: string | null) => {
            if (val) setSortBy(val as "name" | "price" | "stock" | "newest");
          }}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue>{SORT_LABELS[sortBy] ?? "Sort by"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="stock">Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="size-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">No products found</p>
          <p className="text-xs mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {products.map((product) => {
            const { final, hasOffer } = getDisplayPrice(product);
            const title = product.name.length > 30
              ? product.name.slice(0, 30) + "..."
              : product.name;

            return (
              <div
                key={product.id}
                className="relative flex flex-col rounded-xl border bg-card overflow-hidden transition-colors hover:bg-accent/30"
              >
                {/* Image area */}
                <div className="relative flex items-center justify-center h-40 bg-muted/50">
                  {product.pictureUrl ? (
                    <img
                      src={product.pictureUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="size-12 text-muted-foreground/30" />
                  )}

                  {/* Stock badge — top right of image */}
                  <span
                    className={`absolute top-2 right-2 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${getStockColor(product.stock)}`}
                  >
                    {product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
                  </span>

                </div>

                {/* Content below image */}
                <div className="flex flex-col gap-2 p-3">
                  {/* Title */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium leading-snug">{title}</h3>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">{product.category}</Badge>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold">&#8377;{final.toFixed(2)}</span>
                    {hasOffer && (
                      <span className="text-xs text-muted-foreground line-through">&#8377;{product.price.toFixed(2)}</span>
                    )}
                    <Badge variant="outline" className="ml-auto text-[10px]">{product.unit}</Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => setDeleteTarget(product)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(product)}
                    >
                      View Product
                    </Button>
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
        className="fixed bottom-6 right-6 rounded-full shadow-lg sm:hidden size-14"
        onClick={handleCreate}
      >
        <Plus className="size-6" />
      </Button>

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
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
