export type UserRole = "super_admin" | "shop_admin" | "employee";

export interface User {
  id: string;
  name: string;
  mobile: string;
  username: string;
  email?: string;
  role: UserRole;
  roleId: string;
  storeId?: string;
  hasPasscode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  id: string;
  shopname: string;
  adminId: string;
  admin?: User;
  location: string;
  type: string;
  pictureUrl?: string;
  themeColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  storeId?: string; // null = global role
  isSystem: boolean;
  permissions: Permission[];
  createdAt: string;
}

export interface Permission {
  id: string;
  roleId: string;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  barcode?: string;
  category: string;
  price: number;
  purchasePrice: number;
  offerPrice?: number;
  offerType?: "flat" | "percentage";
  stock: number;
  pictureUrl?: string;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  mobile: string;
  email?: string;
  type: "regular" | "new" | "wholesale";
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  storeId: string;
  customerId?: string;
  customer?: Customer;
  createdBy: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: "draft" | "completed" | "cancelled";
  createdAt: string;
}

export interface ReceiptItem {
  id: string;
  receiptId: string;
  productId?: string;
  product?: Product;
  productName: string;
  productUnit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export const UNITS = ["Kg", "g", "l", "ml", "m", "cm", "inch", "piece", "box", "pack", "dozen"] as const;
export type Unit = typeof UNITS[number];

export const STORE_TYPES = ["Grocery", "Electronics", "Clothing", "Hardware", "Pharmacy", "General", "Other"] as const;
export type StoreType = typeof STORE_TYPES[number];

export const MODULES = ["users", "stores", "roles", "products", "customers", "receipts", "info"] as const;
export type Module = typeof MODULES[number];
