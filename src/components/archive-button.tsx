"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleArchiveCustomer } from "@/app/actions/customers";
import { useTransition } from "react";
import { toast } from "sonner";

interface ArchiveButtonProps {
  customerId: number;
  archived: boolean;
}

export function ArchiveButton({ customerId, archived }: ArchiveButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggleArchive = () => {
    startTransition(async () => {
      try {
        await toggleArchiveCustomer({
          customerId,
          archived: !archived,
        });
        toast.success(archived ? "Customer restored" : "Customer archived");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update customer");
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 flex-shrink-0"
      onClick={handleToggleArchive}
      disabled={isPending}
      title={archived ? "Restore customer" : "Archive customer"}
    >
      {archived ? (
        <ArchiveRestore className="h-4 w-4" />
      ) : (
        <Archive className="h-4 w-4" />
      )}
    </Button>
  );
}
