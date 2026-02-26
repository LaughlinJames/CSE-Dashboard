import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { learnedNotesTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { AddLearnedNoteDialog } from "@/components/add-learned-note-dialog";
import { LearnedNoteCard } from "@/components/learned-note-card";

export default async function WhatILearnedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const notes = await db
    .select()
    .from(learnedNotesTable)
    .where(eq(learnedNotesTable.userId, userId))
    .orderBy(desc(learnedNotesTable.createdAt));

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">What I Learned</h1>
          <p className="text-muted-foreground mt-1">
            Notes to commemorate things you&apos;ve learned how to do
          </p>
        </div>
        <AddLearnedNoteDialog />
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No notes yet. Click &quot;Add Note&quot; to record something you&apos;ve learned.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <LearnedNoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
