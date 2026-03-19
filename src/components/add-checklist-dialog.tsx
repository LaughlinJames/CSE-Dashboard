"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createChecklist } from "@/app/actions/checklists";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function AddChecklistDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get("title") as string)?.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }

    startTransition(async () => {
      try {
        await createChecklist({ title });
        toast.success("Checklist created");
        setOpen(false);
        formRef.current?.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create checklist");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New checklist
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New checklist</DialogTitle>
            <DialogDescription>Give it a short name. You can add items after creating it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="checklist-title">Title</Label>
            <Input
              id="checklist-title"
              name="title"
              placeholder="e.g. Onboarding — Acme"
              required
              maxLength={255}
              disabled={isPending}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
