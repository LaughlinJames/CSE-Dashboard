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
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLearnedNote } from "@/app/actions/learned";
import { toast } from "sonner";
import { Lightbulb, Plus } from "lucide-react";
import { LEARNED_NOTE_CATEGORIES } from "@/lib/validations/learned";

const categoryOptions = [...LEARNED_NOTE_CATEGORIES];

export function AddLearnedNoteDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<(typeof categoryOptions)[number]>(
    "AMS Core Tools"
  );
  const [content, setContent] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
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
      title: formData.get("title") as string,
      content: rawContent,
      category,
    };

    startTransition(async () => {
      try {
        await createLearnedNote(data);
        toast.success("Note added!");
        setOpen(false);
        formRef.current?.reset();
        setCategory("AMS Core Tools");
        setContent("");
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to add note");
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              What I Learned
            </DialogTitle>
            <DialogDescription>
              Add a note to commemorate something you&apos;ve learned how to do.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Debugging Drizzle migrations"
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
              <Label htmlFor="content">What you learned *</Label>
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
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
