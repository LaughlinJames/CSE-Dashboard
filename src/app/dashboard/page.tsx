import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { customersTable, customerNotesTable } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddCustomerDialog } from "@/components/add-customer-dialog";
import { ArchiveButton } from "@/components/archive-button";

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

  // Query customers with their latest note using a subquery
  const customers = await db
    .select({
      id: customersTable.id,
      name: customersTable.name,
      lastPatchDate: customersTable.lastPatchDate,
      topology: customersTable.topology,
      dumbledoreStage: customersTable.dumbledoreStage,
      archived: customersTable.archived,
      createdAt: customersTable.createdAt,
      updatedAt: customersTable.updatedAt,
      userId: customersTable.userId,
      latestNote: sql<string | null>`(
        SELECT note 
        FROM ${customerNotesTable} 
        WHERE ${customerNotesTable.customerId} = ${customersTable.id} 
        ORDER BY ${customerNotesTable.createdAt} DESC 
        LIMIT 1
      )`,
      latestNoteDate: sql<Date | null>`(
        SELECT created_at 
        FROM ${customerNotesTable} 
        WHERE ${customerNotesTable.customerId} = ${customersTable.id} 
        ORDER BY ${customerNotesTable.createdAt} DESC 
        LIMIT 1
      )`,
    })
    .from(customersTable)
    .where(eq(customersTable.userId, userId))
    .orderBy(desc(customersTable.updatedAt));

  // Separate active and archived customers
  const activeCustomers = customers.filter(c => !c.archived);
  const archivedCustomers = customers.filter(c => c.archived);

  // Helper function to format dates
  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper function to get badge variant based on topology
  const getTopologyVariant = (topology: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (topology.toLowerCase()) {
      case "prod":
        return "destructive";
      case "stage":
        return "default";
      case "qa":
        return "secondary";
      case "dev":
        return "outline";
      default:
        return "secondary";
    }
  };

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
                  <Card key={customer.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl flex-1">{customer.name}</CardTitle>
                        <div className="flex gap-2 items-start">
                          <div className="flex gap-2">
                            <Badge variant={getTopologyVariant(customer.topology)}>
                              {customer.topology.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              Stage {customer.dumbledoreStage}
                            </Badge>
                          </div>
                          <ArchiveButton customerId={customer.id} archived={customer.archived} />
                        </div>
                      </div>
                      <CardDescription>
                        Customer ID: {customer.id}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Last Patch:</span>
                          <span className="font-medium">
                            {formatDate(customer.lastPatchDate)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Updated:</span>
                          <span className="font-medium">
                            {formatDate(customer.updatedAt)}
                          </span>
                        </div>
                      </div>

                      {customer.latestNote && (
                        <div className="pt-4 border-t">
                          <p className="text-xs text-muted-foreground mb-2">
                            Latest Note ({formatDate(customer.latestNoteDate)}):
                          </p>
                          <p className="text-sm line-clamp-3">
                            {customer.latestNote}
                          </p>
                        </div>
                      )}

                      {!customer.latestNote && (
                        <div className="pt-4 border-t">
                          <p className="text-xs text-muted-foreground italic">
                            No notes yet
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
                  <Card key={customer.id} className="flex flex-col opacity-60">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl flex-1">{customer.name}</CardTitle>
                        <div className="flex gap-2 items-start">
                          <div className="flex gap-2">
                            <Badge variant={getTopologyVariant(customer.topology)}>
                              {customer.topology.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              Stage {customer.dumbledoreStage}
                            </Badge>
                          </div>
                          <ArchiveButton customerId={customer.id} archived={customer.archived} />
                        </div>
                      </div>
                      <CardDescription>
                        Customer ID: {customer.id}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Last Patch:</span>
                          <span className="font-medium">
                            {formatDate(customer.lastPatchDate)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Updated:</span>
                          <span className="font-medium">
                            {formatDate(customer.updatedAt)}
                          </span>
                        </div>
                      </div>

                      {customer.latestNote && (
                        <div className="pt-4 border-t">
                          <p className="text-xs text-muted-foreground mb-2">
                            Latest Note ({formatDate(customer.latestNoteDate)}):
                          </p>
                          <p className="text-sm line-clamp-3">
                            {customer.latestNote}
                          </p>
                        </div>
                      )}

                      {!customer.latestNote && (
                        <div className="pt-4 border-t">
                          <p className="text-xs text-muted-foreground italic">
                            No notes yet
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
