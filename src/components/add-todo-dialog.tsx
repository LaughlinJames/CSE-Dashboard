"use client";

import { useState, useTransition, useRef, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTodo, getActiveCustomers } from "@/app/actions/todos";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type Customer = {
  id: number;
  name: string;
};

type AddTodoDialogProps = {
  defaultCustomerId?: string;
};

export function AddTodoDialog({ defaultCustomerId }: AddTodoDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCustomerId || "none");

  // Fetch active customers when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingCustomers(true);
      // Reset selected customer to default when dialog opens
      setSelectedCustomerId(defaultCustomerId || "none");
      getActiveCustomers()
        .then(setCustomers)
        .catch((error) => {
          console.error("Failed to fetch customers:", error);
          toast.error("Failed to load customers");
        })
        .finally(() => setLoadingCustomers(false));
    }
  }, [open, defaultCustomerId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const customerIdStr = formData.get("customerId") as string;
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      priority: formData.get("priority") as "low" | "medium" | "high",
      dueDate: formData.get("dueDate") as string,
      customerId: customerIdStr && customerIdStr !== "none" ? parseInt(customerIdStr, 10) : undefined,
    };

    startTransition(async () => {
      try {
        await createTodo(data);
        toast.success("To-do created successfully!");
        setOpen(false);
        formRef.current?.reset();
        setSelectedCustomerId(defaultCustomerId || "none");
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to create to-do");
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add To-Do
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New To-Do</DialogTitle>
            <DialogDescription>
              Create a new to-do item. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter to-do title"
                required
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter description (optional)"
                disabled={isPending}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer">Customer (Optional)</Label>
              <Select 
                name="customerId" 
                value={selectedCustomerId} 
                onValueChange={setSelectedCustomerId}
                disabled={isPending || loadingCustomers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCustomers ? "Loading customers..." : "Select customer (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue="medium" disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create To-Do"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
