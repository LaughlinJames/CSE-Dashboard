import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { todosTable, customersTable } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { AddTodoDialog } from "@/components/add-todo-dialog";
import { TodoItem } from "@/components/todo-item";

export default async function TodosPage({
  searchParams,
}: {
  searchParams: { highlight?: string };
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const highlightId = searchParams.highlight ? parseInt(searchParams.highlight) : null;

  // Fetch all todos for the user with customer info, sorted by due date (nulls last), then by priority (high, medium, low)
  const todos = await db
    .select({
      id: todosTable.id,
      title: todosTable.title,
      description: todosTable.description,
      completed: todosTable.completed,
      priority: todosTable.priority,
      dueDate: todosTable.dueDate,
      customerId: todosTable.customerId,
      customerName: customersTable.name,
      createdAt: todosTable.createdAt,
      updatedAt: todosTable.updatedAt,
    })
    .from(todosTable)
    .leftJoin(customersTable, eq(todosTable.customerId, customersTable.id))
    .where(eq(todosTable.userId, userId))
    .orderBy(
      sql`CASE WHEN ${todosTable.dueDate} IS NULL THEN 1 ELSE 0 END`,
      todosTable.dueDate,
      sql`CASE 
        WHEN ${todosTable.priority} = 'high' THEN 1 
        WHEN ${todosTable.priority} = 'medium' THEN 2 
        WHEN ${todosTable.priority} = 'low' THEN 3 
        ELSE 4 
      END`
    );

  // Separate completed and incomplete todos
  const incompleteTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">To-Do List</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tasks and stay organized
          </p>
        </div>
        <AddTodoDialog />
      </div>

      {todos.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No to-dos found. Add your first to-do to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Incomplete Todos */}
          {incompleteTodos.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Active Tasks ({incompleteTodos.length})
              </h2>
              <div className="space-y-3">
                {incompleteTodos.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} highlight={highlightId === todo.id} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Todos */}
          {completedTodos.length > 0 && (
            <div>
              {incompleteTodos.length > 0 && (
                <div className="my-8">
                  <hr className="border-t border-border" />
                </div>
              )}
              <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
                Completed ({completedTodos.length})
              </h2>
              <div className="space-y-3">
                {completedTodos.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} highlight={highlightId === todo.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
