"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <FileQuestion className="size-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Page Not Found</h1>
      <p className="text-muted-foreground text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button onClick={() => router.push("/login")}>Go Home</Button>
    </div>
  );
}
