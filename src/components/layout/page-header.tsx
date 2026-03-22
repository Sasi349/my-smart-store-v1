"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  count?: number;
  backHref?: string;
  children?: React.ReactNode; // for right-side actions like "Add" button
}

export function PageHeader({ title, count, backHref, children }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 mb-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => (backHref ? router.push(backHref) : router.back())}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1 flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {count !== undefined && (
          <Badge variant="secondary">{count}</Badge>
        )}
      </div>
      {children}
    </div>
  );
}
