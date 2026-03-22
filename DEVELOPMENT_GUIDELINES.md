# JyGS Development Guidelines

> Single source of truth for how code is written in this project. Every new page, component, store, or feature must follow these patterns exactly.

---

## Tech Stack (exact versions)

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.2.0 | App Router framework (has breaking changes from earlier versions) |
| react / react-dom | 19.2.4 | UI library |
| typescript | ^5 | Type safety |
| tailwindcss | ^4 | Utility-first CSS (v4 syntax) |
| @base-ui/react | ^1.3.0 | Headless UI primitives (Button, Dialog, Menu, Tabs, Select, etc.) |
| shadcn | ^4.1.0 | Component scaffolding + Tailwind theme |
| class-variance-authority | ^0.7.1 | Variant-based component styling (CVA) |
| clsx | ^2.1.1 | Conditional class joining |
| tailwind-merge | ^3.5.0 | Safe Tailwind class merging |
| zustand | ^5.0.12 | Client-side state management with persist |
| react-hook-form | ^7.71.2 | Form state handling |
| @hookform/resolvers | ^5.2.2 | Zod resolver for react-hook-form |
| zod | ^4.3.6 | Schema validation |
| lucide-react | ^0.577.0 | Icons |
| cmdk | ^1.1.1 | Command palette component |
| tw-animate-css | ^1.4.0 | Tailwind animation utilities |

---

## Project Structure

```
src/
├── app/
│   ├── globals.css              # Tailwind imports, OKLCH CSS variables, theme
│   ├── layout.tsx               # Root layout (ThemeProvider + TooltipProvider)
│   ├── page.tsx                 # Root redirect → /login
│   ├── (auth)/                  # Public routes
│   │   └── login/page.tsx
│   ├── (admin)/                 # Protected: super_admin / shop_admin
│   │   ├── layout.tsx           # Auth guard + Header + AdminBottomNav
│   │   ├── admin/               # Admin pages
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── users/page.tsx
│   │   │   ├── stores/page.tsx
│   │   │   ├── roles/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── profile/page.tsx
│   └── (store)/                 # Protected: requires currentStore
│       ├── layout.tsx           # Store auth guard + theme color application
│       └── store/               # Store pages
│           ├── page.tsx         # Dashboard
│           ├── products/page.tsx
│           ├── customers/page.tsx
│           ├── employees/page.tsx
│           ├── info/page.tsx
│           └── receipts/
│               ├── page.tsx
│               └── [id]/page.tsx
├── components/
│   ├── theme-provider.tsx       # Dark/light mode + OKLCH primary color
│   ├── ui/                      # Reusable UI components (shadcn + base-ui)
│   ├── layout/                  # App layout components
│   │   ├── header.tsx
│   │   ├── page-header.tsx
│   │   ├── bottom-nav.tsx       # Admin mobile nav
│   │   └── store-bottom-nav.tsx # Store mobile nav
│   └── modules/                 # Feature-specific components
│       ├── admin/               # Admin form dialogs
│       └── store/               # Store form dialogs + POS
├── stores/                      # Zustand state stores
├── hooks/                       # Custom React hooks
├── lib/                         # Utilities + mock data
│   ├── utils.ts                 # cn() utility
│   ├── mock-auth.ts
│   ├── mock-data.ts
│   ├── mock-products.ts
│   └── mock-customers.ts
└── types/
    └── index.ts                 # All TypeScript interfaces + constants
```

### Where files go

| What you're creating | Where it goes |
|---------------------|---------------|
| New page | `src/app/(admin)/admin/<name>/page.tsx` or `src/app/(store)/store/<name>/page.tsx` |
| New UI component | `src/components/ui/<name>.tsx` |
| New feature component (form dialog, etc.) | `src/components/modules/<admin\|store>/<name>.tsx` |
| New layout component | `src/components/layout/<name>.tsx` |
| New Zustand store | `src/stores/<name>-store.ts` |
| New custom hook | `src/hooks/use-<name>.ts` |
| New type/interface | `src/types/index.ts` (single file, add to it) |
| New mock data | `src/lib/mock-<name>.ts` |

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files & directories | kebab-case | `product-form-dialog.tsx`, `auth-store.ts` |
| React components | PascalCase | `ProductFormDialog`, `PageHeader` |
| Hooks | camelCase with `use` prefix | `useIsMobile`, `useAuthStore` |
| Zustand stores | `use<Name>Store` | `useProductsStore` |
| Types/interfaces | PascalCase | `Product`, `UserRole` |
| Constants | SCREAMING_SNAKE_CASE | `UNITS`, `STORE_TYPES`, `MODULES` |
| CSS variables | kebab-case with `--` prefix | `--primary`, `--background` |
| Route groups | parentheses | `(admin)`, `(store)`, `(auth)` |

### Import rules
- Always use `@/` path alias (never relative `../`)
- Order: external packages → `@/` imports → relative (if any)

```typescript
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Product } from "@/types";
import { useProductsStore } from "@/stores/products-store";
import { Button } from "@/components/ui/button";
```

---

## Component Patterns

### UI Components (`src/components/ui/`)

All UI components wrap `@base-ui/react` primitives with Tailwind styling via CVA + `cn()`.

**Standard pattern:**
```tsx
"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "base-classes...",
  {
    variants: {
      variant: { default: "...", outline: "...", ghost: "..." },
      size: { default: "...", sm: "...", lg: "..." },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

**Key rules:**
- Use `data-slot="<name>"` attribute on root element
- Export both the component and its variants
- Props extend the base-ui primitive's Props type + CVA VariantProps
- Use `cn()` to merge classNames (never raw string concatenation)
- Add `"use client"` directive at top

### Compound Components

Components like Card, Dialog, Table use the compound pattern:
```tsx
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card" className={cn("...", className)} {...props} />
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("...", className)} {...props} />
}
// ... CardTitle, CardContent, CardFooter, etc.
export { Card, CardHeader, CardTitle, CardContent, CardFooter }
```

### Available UI Components

These components already exist in `src/components/ui/` — always reuse them:

| Component | Import from | Key variants/props |
|-----------|------------|-------------------|
| Button | `@/components/ui/button` | variant: default, outline, secondary, ghost, destructive, link; size: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg |
| Card | `@/components/ui/card` | Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter |
| Input | `@/components/ui/input` | Standard input with focus ring + aria-invalid styling |
| Label | `@/components/ui/label` | Standard label |
| Badge | `@/components/ui/badge` | variant: default, secondary, destructive, outline, ghost, link |
| Avatar | `@/components/ui/avatar` | Avatar, AvatarImage, AvatarFallback; size: default, sm, lg |
| Select | `@/components/ui/select` | Select, SelectTrigger, SelectValue, SelectContent, SelectItem |
| Dialog | `@/components/ui/dialog` | Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter |
| DropdownMenu | `@/components/ui/dropdown-menu` | DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem |
| Sheet | `@/components/ui/sheet` | side: top, right, bottom, left |
| Tabs | `@/components/ui/tabs` | variant: default, line |
| Table | `@/components/ui/table` | Table, TableHeader, TableBody, TableRow, TableHead, TableCell |
| Switch | `@/components/ui/switch` | size: default, sm |
| Popover | `@/components/ui/popover` | Popover, PopoverTrigger, PopoverContent |
| Tooltip | `@/components/ui/tooltip` | Tooltip, TooltipTrigger, TooltipContent |
| Command | `@/components/ui/command` | Command palette (wraps cmdk) |
| Sidebar | `@/components/ui/sidebar` | Full sidebar system with context |
| Separator | `@/components/ui/separator` | Horizontal/vertical divider |
| Skeleton | `@/components/ui/skeleton` | Loading placeholder |
| Textarea | `@/components/ui/textarea` | Multi-line input |
| InputGroup | `@/components/ui/input-group` | Input with addons/buttons |

---

## Page Pattern

Every page follows this structure:

```tsx
"use client";

import { useState } from "react";
import { useXxxStore } from "@/stores/xxx-store";
import { PageHeader } from "@/components/layout/page-header";
import { XxxFormDialog } from "@/components/modules/store/xxx-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import type { Xxx } from "@/types";

export default function XxxPage() {
  const { filteredXxx, searchQuery, setSearchQuery, deleteXxx } = useXxxStore();
  const items = filteredXxx();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Xxx | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Xxx | null>(null);

  // ... handlers

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="Title" count={items.length} backHref="/store">
        <Button size="sm" onClick={handleCreate} className="hidden sm:flex">
          <Plus className="size-4" data-icon="inline-start" />
          Add Item
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search + Select filters */}
      </div>

      {/* Content Grid or Empty State */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          {/* Empty state icon + text */}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Item cards */}
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

      {/* Form Dialog + Delete Confirmation Dialog */}
    </div>
  );
}
```

### Layout Pattern

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useAuthStore } from "@/stores/auth-store";

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-6">
        <div className="mx-auto w-full max-w-7xl px-4 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
```

---

## State Management (Zustand)

### Store Pattern

```typescript
import { create } from "zustand";
import type { Xxx } from "@/types";
import { mockXxx } from "@/lib/mock-xxx";

type SortBy = "name" | "newest";

interface XxxState {
  items: Xxx[];
  searchQuery: string;
  filter: string;
  sortBy: SortBy;
  addItem: (item: Xxx) => void;
  updateItem: (id: string, data: Partial<Xxx>) => void;
  deleteItem: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: string) => void;
  setSortBy: (sortBy: SortBy) => void;
  filteredItems: () => Xxx[];
}

export const useXxxStore = create<XxxState>()((set, get) => ({
  items: mockXxx,
  searchQuery: "",
  filter: "all",
  sortBy: "newest",

  addItem: (item) =>
    set((state) => ({ items: [...state.items, item] })),

  updateItem: (id, data) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...data } : i)),
    })),

  deleteItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilter: (filter) => set({ filter }),
  setSortBy: (sortBy) => set({ sortBy }),

  filteredItems: () => {
    const { items, searchQuery, filter, sortBy } = get();
    const query = searchQuery.toLowerCase().trim();
    // filter → sort → return
  },
}));
```

### Persisted stores (auth, theme)

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({ /* state + actions */ }),
    { name: "jygs-auth" } // localStorage key
  )
);
```

**Rules:**
- Only `auth-store` and `theme-store` use `persist` middleware
- Data stores (products, customers, etc.) do NOT persist — they initialize from mock data
- `filteredItems()` is a method using `get()`, not a derived state
- Search is always case-insensitive with `.toLowerCase().trim()`

---

## Form Dialog Pattern

```tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Xxx } from "@/types";
import { useXxxStore } from "@/stores/xxx-store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 1. Define Zod schema
const xxxSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // ... fields
});

type XxxFormValues = z.infer<typeof xxxSchema>;

// 2. Props interface
interface XxxFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Xxx | null; // null = create mode, Xxx = edit mode
}

// 3. Component
export function XxxFormDialog({ open, onOpenChange, item }: XxxFormDialogProps) {
  const { addItem, updateItem } = useXxxStore();
  const isEditing = !!item;

  const form = useForm<XxxFormValues>({
    resolver: zodResolver(xxxSchema) as any,
    defaultValues: { name: "", /* ... */ },
  });

  // 4. Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({ name: item.name, /* ... */ });
      } else {
        form.reset({ name: "", /* ... */ });
      }
    }
  }, [open, item, form]);

  // 5. Submit handler
  function onSubmit(values: XxxFormValues) {
    const now = new Date().toISOString();
    if (isEditing && item) {
      updateItem(item.id, { ...values, updatedAt: now });
    } else {
      addItem({
        id: `xxx-${Date.now()}`,
        ...values,
        createdAt: now,
        updatedAt: now,
      });
    }
    onOpenChange(false);
  }

  // 6. Render
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Add"} Item</DialogTitle>
          <DialogDescription>...</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Form fields */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...form.register("name")} aria-invalid={!!form.formState.errors.name} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          {/* Grid layout for side-by-side fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ... */}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{isEditing ? "Save Changes" : "Add Item"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Form field error pattern:**
```tsx
<div className="flex flex-col gap-1.5">
  <Label htmlFor="fieldName">Field Name *</Label>
  <Input id="fieldName" {...form.register("fieldName")} aria-invalid={!!form.formState.errors.fieldName} />
  {form.formState.errors.fieldName && (
    <p className="text-xs text-destructive">{form.formState.errors.fieldName.message}</p>
  )}
</div>
```

**Select field in form:**
```tsx
<Select
  value={form.watch("field")}
  onValueChange={(val: string | null) => {
    if (val) form.setValue("field", val as FormValues["field"]);
  }}
>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

---

## Styling Rules

### Tailwind CSS 4
- Use Tailwind utility classes directly — no custom CSS files beyond `globals.css`
- Use `cn()` from `@/lib/utils` for conditional/merged classes
- Never use inline `style={{}}` for layout — only for dynamic values like theme colors

### Color System: OKLCH
- All theme colors use OKLCH color space in CSS variables
- Never use hex/rgb values in CSS custom properties
- Dark mode uses `.dark` class on `<html>` element

### Responsive Design
- **Mobile-first**: base styles are mobile, add `sm:` / `md:` / `lg:` / `xl:` for larger screens
- **Primary breakpoint**: `md:` (768px) — this is where mobile nav hides and desktop layout kicks in
- **Bottom padding**: pages use `pb-20 md:pb-6` to account for mobile bottom nav
- **Grid patterns**: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`
- **Mobile FAB**: Fixed bottom-right button visible only on `sm:hidden`
- **Filter layout**: `flex flex-col sm:flex-row gap-3`

### Common class patterns
```
// Card hover
"rounded-xl border bg-card overflow-hidden transition-colors hover:bg-accent/30"

// Empty state
"flex flex-col items-center justify-center py-16 text-muted-foreground"

// Search input with icon
"relative flex-1" → <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

// Icon sizing
"size-4" (16px), "size-5" (20px), "size-6" (24px), "size-12" (48px)

// Text sizes
"text-xs", "text-sm", "text-base", "text-[10px]", "text-[11px]"

// Semantic colors (use these, not raw colors)
"text-foreground", "text-muted-foreground", "bg-background", "bg-card", "bg-muted",
"bg-primary", "text-primary-foreground", "border-border", "text-destructive"
```

### Data attributes
- `data-slot="name"` — component identification
- `data-icon="inline-start"` / `data-icon="inline-end"` — icon positioning in buttons
- `aria-invalid={!!errors.field}` — form validation state

---

## Type Definitions

All types live in `src/types/index.ts`. When adding a new feature:

1. Add the interface to `src/types/index.ts`
2. Add any related constants as `const` arrays with `as const`
3. Export a type derived from the const: `export type Xxx = typeof XXX[number];`

**ID generation**: `${prefix}-${Date.now()}` (e.g., `prod-1234567890`)

**Timestamps**: Always ISO strings via `new Date().toISOString()`, fields named `createdAt` and `updatedAt`

---

## Delete Confirmation Pattern

Every delete action uses an inline Dialog:

```tsx
const [deleteTarget, setDeleteTarget] = useState<Xxx | null>(null);

function handleDeleteConfirm() {
  if (deleteTarget) {
    deleteXxx(deleteTarget.id);
    setDeleteTarget(null);
  }
}

// In JSX:
<Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete Item</DialogTitle>
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
```

---

## Icons

Use `lucide-react` for all icons. Common icons used:
- Navigation: `ArrowLeft`, `Home`, `Settings`, `ChevronRight`
- Actions: `Plus`, `Trash2`, `Pencil`, `Search`, `X`
- Domain: `Package`, `Users`, `Store`, `ShoppingCart`, `Receipt`
- UI: `Sun`, `Moon`, `Monitor`, `Check`, `LogOut`

**Icon sizing**: Always use `className="size-N"` (e.g., `size-4`, `size-5`, `size-6`)

---

## Do's and Don'ts

### Do
- Reuse existing UI components from `src/components/ui/`
- Follow the established Zustand store pattern exactly
- Use `cn()` for all className merging
- Use `@/` path alias for all imports
- Add `"use client"` to any component using hooks, state, or browser APIs
- Use semantic color classes (`text-foreground`, `bg-card`, etc.)
- Mobile-first responsive design
- Use `form.register()` for input binding with react-hook-form
- Use `aria-invalid` for form validation state
- Use `z.coerce.number()` for numeric form fields
- Add `as any` to `zodResolver()` calls (known type compatibility issue)

### Don't
- Don't create new UI primitives — wrap `@base-ui/react` components instead
- Don't use CSS modules or styled-components
- Don't use `useEffect` for derived state — compute inline or use Zustand's `get()`
- Don't use `React.FC` — use plain function declarations
- Don't use default exports for components (except pages)
- Don't use `useRef` for form state — use react-hook-form
- Don't hardcode colors — use Tailwind semantic tokens
- Don't use `px-*` for icon sizing — use `size-*`
- Don't create separate types files — add to `src/types/index.ts`
- Don't use relative imports (`../`) — use `@/`
- Don't skip the `data-slot` attribute on component root elements
- Don't assume Next.js APIs work the same as older versions — always check `node_modules/next/dist/docs/01-app/`

---

## Multi-Tenant Architecture

- **Super Admin**: Manages all stores, users, and roles at platform level
- **Shop Admin**: Manages a single store (products, customers, receipts, employees)
- **Employee**: Limited access within a store based on role permissions
- **Route groups**: `(admin)` for platform management, `(store)` for store-scoped views
- **Store context**: `useAuthStore().currentStore` determines which store data to show
- **Impersonation**: Super Admin can "Go to Store" to view as Shop Admin, with `isImpersonating` flag
- **Per-store theming**: Each store can have its own `themeColor`, applied in the `(store)` layout
