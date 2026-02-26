"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteLearnedNote } from "@/app/actions/learned";
import { toast } from "sonner";
import { Trash2, Lightbulb, Pencil } from "lucide-react";
import { EditLearnedNoteDialog } from "@/components/edit-learned-note-dialog";

type LearnedNoteCardProps = {
  note: {
    id: number;
    title: string;
    content: string;
    category: string;
    createdAt: Date;
  };
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export function LearnedNoteCard({ note }: LearnedNoteCardProps) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = () => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteLearnedNote({ id: note.id });
        toast.success("Note deleted");
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to delete note");
        }
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-start gap-2 min-w-0">
          <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="font-semibold text-lg leading-tight">{note.title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {note.category} · {formatDate(note.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setEditOpen(true)}
            disabled={isPending}
            aria-label="Edit note"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
            aria-label="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <EditLearnedNoteDialog
        note={editOpen ? note : null}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <CardContent className="pt-0">
        {note.content.trim().startsWith("<") && note.content.includes(">") ? (
          <div
            className="prose prose-sm max-w-none text-muted-foreground [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800 dark:[&_a]:text-blue-400 dark:[&_a]:hover:text-blue-300 [&_a]:cursor-pointer [&_img]:rounded-md [&_img]:max-w-full [&_img]:h-auto"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
        ) : (
          <p className="text-muted-foreground whitespace-pre-wrap">
            {note.content}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
