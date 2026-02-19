"use client";

import { useState, useTransition, useEffect, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/rich-text-editor";
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
  highlight?: boolean;
};

export function TodoItem({ todo, highlight = false }: TodoItemProps) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const [editDescription, setEditDescription] = useState("");

  // Scroll into view when highlighted
  useEffect(() => {
    if (highlight && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [highlight]);

  // Fetch active customers when edit dialog opens
  useEffect(() => {
    if (editOpen) {
      setLoadingCustomers(true);
      setEditDescription(todo.description || "");
      getActiveCustomers()
        .then(setCustomers)
        .catch((error) => {
          console.error("Failed to fetch customers:", error);
          toast.error("Failed to load customers");
        })
        .finally(() => setLoadingCustomers(false));
    }
  }, [editOpen, todo.description]);

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
      description: editDescription,
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

  // Badge colors for priority
  const priorityColors = {
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    high: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const priorityColor = priorityColors[todo.priority as keyof typeof priorityColors] || priorityColors.medium;

  // Get card background color based on priority
  const getCardBackgroundClass = () => {
    if (todo.priority === "high") {
      return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50";
    }
    if (todo.priority === "medium") {
      return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/50";
    }
    return ""; // Low priority uses default card styling
  };

  // Parse date string in local timezone (avoid UTC conversion)
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Calculate due date styling
  const getDueDateStyle = () => {
    if (!todo.dueDate) return "text-muted-foreground";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = parseLocalDate(todo.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Today or past: red and bold
    if (diffDays <= 0) {
      return "text-red-600 dark:text-red-500 font-bold";
    }
    // Within next 3 days: yellow
    if (diffDays <= 3) {
      return "text-yellow-600 dark:text-yellow-500";
    }
    // Default
    return "text-muted-foreground";
  };

  return (
    <>
      <Card ref={cardRef} className={`${todo.completed ? "opacity-60" : ""} ${highlight ? "ring-2 ring-green-500 ring-offset-2 shadow-lg" : ""} ${getCardBackgroundClass()}`}>
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
                  <div className={`flex items-center gap-1 text-xs ${getDueDateStyle()}`}>
                    <Calendar className="h-3 w-3" />
                    {parseLocalDate(todo.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              {todo.description && (
                <div 
                  className={`text-sm prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline ${todo.completed ? "line-through opacity-60" : ""}`}
                  dangerouslySetInnerHTML={{ __html: todo.description }}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-hidden p-0">
          <form onSubmit={handleEdit} className="flex flex-col max-h-[90vh]">
            <div className="px-6 pt-6 pb-2 shrink-0">
              <DialogHeader>
                <DialogTitle>Edit To-Do</DialogTitle>
                <DialogDescription>
                  Update the details of your to-do item.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <div className="grid gap-4">
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
                  <RichTextEditor
                    value={editDescription}
                    onChange={setEditDescription}
                    placeholder="Enter description (optional)"
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
            </div>
            <div className="px-6 pb-6 pt-4 border-t shrink-0 bg-background">
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
            </div>
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
