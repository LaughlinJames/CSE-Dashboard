"use client";

import { useState, useTransition, useRef } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    const data = {
      name: formData.get("name") as string,
      lastPatchDate: formData.get("lastPatchDate") as string,
      lastPatchVersion: formData.get("lastPatchVersion") as string,
      temperament: formData.get("temperament") as "happy" | "satisfied" | "neutral" | "concerned" | "frustrated",
      topology: formData.get("topology") as "dev" | "qa" | "stage" | "prod",
      dumbledoreStage: parseInt(formData.get("dumbledoreStage") as string),
      patchFrequency: formData.get("patchFrequency") as "monthly" | "quarterly",
      workLoad: formData.get("workLoad") as "low" | "medium" | "high",
      cloudManager: formData.get("cloudManager") as "no" | "implementing" | "yes",
      products: formData.get("products") as "sites" | "assets" | "sites and assets",
    };

    startTransition(async () => {
      try {
        await createCustomer(data);
        setOpen(false);
        formRef.current?.reset();
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Create a new customer record. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 mt-4">
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperament">Customer Temperament *</Label>
            <Select name="temperament" defaultValue="neutral" disabled={isPending}>
              <SelectTrigger id="temperament">
                <SelectValue placeholder="Select temperament" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="happy">😊 Happy</SelectItem>
                <SelectItem value="satisfied">🙂 Satisfied</SelectItem>
                <SelectItem value="neutral">😐 Neutral</SelectItem>
                <SelectItem value="concerned">😟 Concerned</SelectItem>
                <SelectItem value="frustrated">😤 Frustrated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patchFrequency">Patch Frequency *</Label>
              <Select name="patchFrequency" defaultValue="monthly" disabled={isPending}>
                <SelectTrigger id="patchFrequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workLoad">Work Load *</Label>
              <Select name="workLoad" defaultValue="medium" disabled={isPending}>
                <SelectTrigger id="workLoad">
                  <SelectValue placeholder="Select work load" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cloudManager">Cloud Manager *</Label>
              <Select name="cloudManager" defaultValue="no" disabled={isPending}>
                <SelectTrigger id="cloudManager">
                  <SelectValue placeholder="Select cloud manager status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="implementing">Implementing</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="products">Products *</Label>
              <Select name="products" defaultValue="sites" disabled={isPending}>
                <SelectTrigger id="products">
                  <SelectValue placeholder="Select products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sites">Sites</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                  <SelectItem value="sites and assets">Sites and Assets</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
