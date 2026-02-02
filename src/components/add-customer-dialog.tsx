"use client";

import { useState, useTransition } from "react";
import { createCustomer } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export function AddCustomerDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    const data = {
      name: formData.get("name") as string,
      lastPatchDate: formData.get("lastPatchDate") as string,
      lastPatchVersion: formData.get("lastPatchVersion") as string,
      topology: formData.get("topology") as "dev" | "qa" | "stage" | "prod",
      dumbledoreStage: parseInt(formData.get("dumbledoreStage") as string),
    };

    startTransition(async () => {
      try {
        await createCustomer(data);
        setOpen(false);
        e.currentTarget.reset();
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Failed to create customer");
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Create a new customer record. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Acme Corp"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastPatchDate">Last Patch Date</Label>
            <Input
              id="lastPatchDate"
              name="lastPatchDate"
              type="date"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastPatchVersion">Last Patch Version</Label>
            <Input
              id="lastPatchVersion"
              name="lastPatchVersion"
              type="text"
              placeholder="e.g., v1.2.3"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topology">Topology *</Label>
            <Select name="topology" defaultValue="dev" disabled={isPending}>
              <SelectTrigger id="topology">
                <SelectValue placeholder="Select topology" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dev">Dev</SelectItem>
                <SelectItem value="qa">QA</SelectItem>
                <SelectItem value="stage">Stage</SelectItem>
                <SelectItem value="prod">Prod</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dumbledoreStage">Dumbledore Stage *</Label>
            <Select name="dumbledoreStage" defaultValue="1" disabled={isPending}>
              <SelectTrigger id="dumbledoreStage">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((stage) => (
                  <SelectItem key={stage} value={stage.toString()}>
                    Stage {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
