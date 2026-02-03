"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { toggleTodoComplete, updateTodo, deleteTodo, getActiveCustomers } from "@/app/actions/todos";
import { toast } from "sonner";
import { Pencil, Trash2, Calendar, Building2 } from "lucide-react";

type Customer = {
  id: number;
  name: string;
};

type TodoItemProps = {
  todo: {
    id: number;
    title: string;
    description: string | null;
    completed: boolean;
    priority: string;
    dueDate: string | null;
    customerId: number | null;
    customerName: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export function TodoItem({ todo }: TodoItemProps) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Fetch active customers when edit dialog opens
  useEffect(() => {
    if (editOpen) {
      setLoadingCustomers(true);
      getActiveCustomers()
        .then(setCustomers)
        .catch((error) => {
          console.error("Failed to fetch customers:", error);
          toast.error("Failed to load customers");
        })
        .finally(() => setLoadingCustomers(false));
    }
  }, [editOpen]);

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await toggleTodoComplete(todo.id);
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to update to-do");
        }
      }
    });
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const customerIdStr = formData.get("customerId") as string;
    const data = {
      id: todo.id,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      priority: formData.get("priority") as "low" | "medium" | "high",
      dueDate: formData.get("dueDate") as string,
      customerId: customerIdStr && customerIdStr !== "none" ? parseInt(customerIdStr, 10) : undefined,
    };

    startTransition(async () => {
      try {
        await updateTodo(data);
        toast.success("To-do updated successfully!");
        setEditOpen(false);
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to update to-do");
        }
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteTodo({ id: todo.id });
        toast.success("To-do deleted successfully!");
        setDeleteOpen(false);
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to delete to-do");
        }
      }
    });
  };

  const priorityColors = {
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    high: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const priorityColor = priorityColors[todo.priority as keyof typeof priorityColors] || priorityColors.medium;

  return (
    <>
      <Card className={todo.completed ? "opacity-60" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={todo.completed}
              onCheckedChange={handleToggle}
              disabled={isPending}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className={`font-medium ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                  {todo.title}
                </h3>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditOpen(true)}
                    disabled={isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteOpen(true)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {todo.description && (
                <div 
                  className={`text-sm prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline ${todo.completed ? "line-through opacity-60" : ""}`}
                  dangerouslySetInnerHTML={{ __html: todo.description }}
                />
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={priorityColor}>
                  {todo.priority}
                </Badge>
                {todo.customerName && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {todo.customerName}
                  </div>
                )}
                {todo.dueDate && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(todo.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit To-Do</DialogTitle>
              <DialogDescription>
                Update the details of your to-do item.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  name="title"
                  defaultValue={todo.title}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={todo.description || ""}
                  disabled={isPending}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-customer">Customer (Optional)</Label>
                <Select name="customerId" defaultValue={todo.customerId?.toString() || "none"} disabled={isPending || loadingCustomers}>
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
                <Label htmlFor="edit-priority">Priority</Label>
                <Select name="priority" defaultValue={todo.priority} disabled={isPending}>
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
                <Label htmlFor="edit-dueDate">Due Date</Label>
                <Input
                  id="edit-dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={todo.dueDate || ""}
                  disabled={isPending}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete To-Do</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this to-do? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
