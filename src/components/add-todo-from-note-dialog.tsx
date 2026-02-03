"use client";

import { useState, useTransition, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTodo } from "@/app/actions/todos";
import { toast } from "sonner";
import { ListPlus } from "lucide-react";

type AddTodoFromNoteDialogProps = {
  noteContent: string;
  customerId: number;
  customerName: string;
};

export function AddTodoFromNoteDialog({ 
  noteContent, 
  customerId,
  customerName 
}: AddTodoFromNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      title: formData.get("title") as string,
      description: noteContent, // Use note content as description
      priority: formData.get("priority") as "low" | "medium" | "high",
      dueDate: formData.get("dueDate") as string,
      customerId: customerId, // Customer is pre-set
    };

    startTransition(async () => {
      try {
        await createTodo(data);
        toast.success("To-do created from note!");
        setOpen(false);
        formRef.current?.reset();
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
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 w-8 p-0"
          title="Create to-do from this note"
        >
          <ListPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create To-Do from Note</DialogTitle>
            <DialogDescription>
              Create a to-do for {customerName}. The note content will be used as the description.
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
              <Label>Customer</Label>
              <Input
                value={customerName}
                disabled
                className="bg-muted"
              />
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
            <div className="grid gap-2">
              <Label>Description (from note)</Label>
              <div 
                className="text-sm border rounded-md p-3 bg-muted max-h-32 overflow-y-auto prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground"
                dangerouslySetInnerHTML={{ __html: noteContent }}
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
