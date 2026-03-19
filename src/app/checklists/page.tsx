import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { checklistsTable, checklistItemsTable } from "@/db/schema";
import { eq, asc, desc, inArray } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { AddChecklistDialog } from "@/components/add-checklist-dialog";
import { ChecklistCard, type ChecklistItemDTO } from "@/components/checklist-card";

export default async function ChecklistsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const checklists = await db
    .select()
    .from(checklistsTable)
    .where(eq(checklistsTable.userId, userId))
    .orderBy(desc(checklistsTable.updatedAt));

  const ids = checklists.map((c) => c.id);
  const itemsByChecklist: Record<number, ChecklistItemDTO[]> = {};

  if (ids.length > 0) {
    const items = await db
      .select()
      .from(checklistItemsTable)
      .where(inArray(checklistItemsTable.checklistId, ids))
      .orderBy(asc(checklistItemsTable.sortOrder));

    for (const row of items) {
      if (!itemsByChecklist[row.checklistId]) itemsByChecklist[row.checklistId] = [];
      itemsByChecklist[row.checklistId].push({
        id: row.id,
        text: row.text,
        completed: row.completed,
        sortOrder: row.sortOrder,
      });
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Checklists</h1>
          <p className="text-muted-foreground mt-1">Create lists, edit lines, and check them off as you go.</p>
        </div>
        <AddChecklistDialog />
      </div>

      {checklists.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No checklists yet. Create one to start tracking steps or recurring work.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {checklists.map((c) => (
            <ChecklistCard
              key={c.id}
              checklist={{
                id: c.id,
                title: c.title,
                items: itemsByChecklist[c.id] ?? [],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
