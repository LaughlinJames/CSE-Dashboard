import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { customersTable, customerNotesTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { AddCustomerDialog } from "@/components/add-customer-dialog";
import { CustomerCard } from "@/components/customer-card";

// Define types for the query results
type CustomerWithNote = {
  id: number;
  name: string;
  lastPatchDate: string | null;
  topology: string;
  dumbledoreStage: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  latestNote: string | null;
  latestNoteDate: Date | null;
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
    .orderBy(desc(customersTable.updatedAt));

  // Fetch all notes for these customers
  const allNotes = await db
    .select()
    .from(customerNotesTable)
    .where(eq(customerNotesTable.userId, userId))
    .orderBy(desc(customerNotesTable.createdAt));

  // Combine customers with their latest note
  const customers: CustomerWithNote[] = customersData.map(customer => {
    // Find the latest note for this customer
    const latestNote = allNotes.find(note => note.customerId === customer.id);
    
    return {
      ...customer,
      lastPatchDate: customer.lastPatchDate,
      latestNote: latestNote?.note ?? null,
      latestNoteDate: latestNote?.createdAt ?? null,
    };
  });

  // Separate active and archived customers
  const activeCustomers = customers.filter(c => !c.archived);
  const archivedCustomers = customers.filter(c => c.archived);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Customer Dashboard</h1>
            <p className="text-muted-foreground">
              Manage and track your customer success engineering activities
            </p>
          </div>
          <AddCustomerDialog />
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
        <div className="space-y-8">
          {/* Active Customers */}
          {activeCustomers.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Active Customers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCustomers.map((customer) => (
                  <CustomerCard key={customer.id} customer={customer} />
                ))}
              </div>
            </div>
          )}

          {/* Archived Customers */}
          {archivedCustomers.length > 0 && (
            <div>
              {activeCustomers.length > 0 && (
                <div className="my-8">
                  <hr className="border-t border-border" />
                </div>
              )}
              <h2 className="text-2xl font-semibold mb-4 text-muted-foreground">Archived Customers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedCustomers.map((customer) => (
                  <CustomerCard key={customer.id} customer={customer} archived />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
