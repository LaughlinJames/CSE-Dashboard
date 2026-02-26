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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLearnedNote } from "@/app/actions/learned";
import { toast } from "sonner";
import { Lightbulb } from "lucide-react";
import { LEARNED_NOTE_CATEGORIES } from "@/lib/validations/learned";

const categoryOptions = [...LEARNED_NOTE_CATEGORIES];

type Note = {
  id: number;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
};

type EditLearnedNoteDialogProps = {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditLearnedNoteDialog({
  note,
  open,
  onOpenChange,
}: EditLearnedNoteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof categoryOptions)[number]>(
    "AMS Core Tools"
  );
  const [content, setContent] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (open && note) {
      setTitle(note.title);
      setCategory(
        (categoryOptions.includes(note.category as (typeof categoryOptions)[number])
          ? note.category
          : categoryOptions[0]) as (typeof categoryOptions)[number]
      );
      setContent(note.content);
    }
  }, [open, note]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!note) return;
    const rawContent = content.trim() || "";
    const hasText =
      rawContent.length > 0 &&
      rawContent !== "<p></p>" &&
      rawContent !== "<p><br></p>" &&
      rawContent.replace(/<[^>]*>/g, "").trim().length > 0;
    if (!hasText) {
      toast.error("Please add something you learned.");
      return;
    }

    const data = {
      id: note.id,
      title: title.trim(),
      content: rawContent,
      category,
    };

    startTransition(async () => {
      try {
        await updateLearnedNote(data);
        toast.success("Note updated!");
        onOpenChange(false);
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to update note");
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Edit note
            </DialogTitle>
            <DialogDescription>
              Update the title, category, or what you learned.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                name="title"
                placeholder="e.g. Debugging Drizzle migrations"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(value) =>
                  setCategory(value as (typeof categoryOptions)[number])
                }
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-content">What you learned *</Label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Describe what you learned and how... Add links with the link button, or drag and drop images here."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
