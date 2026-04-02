import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { customersTable, customerNotesTable } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { AddCustomerDialog } from "@/components/add-customer-dialog";
import { WeeklyReportButton } from "@/components/weekly-report-button";
import { DashboardCustomerGrid } from "@/components/dashboard-customer-grid";

// Define types for the query results
type CustomerWithNote = {
  id: number;
  name: string;
  lastPatchDate: string | null;
  lastPatchVersion: string | null;
  temperament: string;
  topology: string;
  dumbledoreStage: number;
  patchFrequency: string;
  workLoad: string;
  cloudManager: string;
  products: string;
  mscUrl: string | null;
  topologyStub: string | null;
  runbookUrl: string | null;
  snowUrl: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  latestNote: string | null;
  latestNoteDate: Date | null;
  /** From prod Author in `amstool list` (topology stub → Sites over Assets) + `amstool info -e` patch-level */
  amstoolResolvedPatchLevel: string | null;
  amstoolPatchLevelErrorMessage: string | null;
};

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch all customers for the user
  const customersData = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.userId, userId))
    .orderBy(asc(customersTable.name));

  // Fetch all notes for these customers
  const allNotes = await db
    .select()
    .from(customerNotesTable)
    .where(eq(customerNotesTable.userId, userId))
    .orderBy(desc(customerNotesTable.createdAt));

  // Patch levels load in a client follow-up action so dashboard RSC (and POST /dashboard) is not blocked on amstool CLI.
  const customers: CustomerWithNote[] = customersData.map((customer) => {
    const latestNote = allNotes.find((note) => note.customerId === customer.id);

    return {
      ...customer,
      lastPatchDate: customer.lastPatchDate,
      latestNote: latestNote?.note ?? null,
      latestNoteDate: latestNote?.createdAt ?? null,
      amstoolResolvedPatchLevel: null,
      amstoolPatchLevelErrorMessage: null,
    };
  });

  // Separate active and archived customers
  const activeCustomers = customers.filter(c => !c.archived);
  const archivedCustomers = customers.filter(c => c.archived);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-end">
          <div className="flex gap-2">
            <WeeklyReportButton />
            <AddCustomerDialog />
          </div>
        </div>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No customers found. Add your first customer to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DashboardCustomerGrid
          activeCustomers={activeCustomers}
          archivedCustomers={archivedCustomers}
        />
      )}
    </div>
  );
}
