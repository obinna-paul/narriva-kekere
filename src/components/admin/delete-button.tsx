"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface DeleteButtonProps {
  endpoint: string;
  confirmLabel: string;
}

export function DeleteButton({ endpoint, confirmLabel }: DeleteButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete ${confirmLabel}? This can't be undone.`)) return;

    setDeleting(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    setDeleting(false);

    if (res.ok) {
      router.refresh();
    } else {
      window.alert("Couldn't delete — check the console for details.");
      console.error(await res.text());
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
    >
      {deleting ? "Deleting…" : "Delete"}
    </button>
  );
}
