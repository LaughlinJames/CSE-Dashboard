"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { customersTable, customerNotesTable, customerAuditLogTable, customerNoteAuditLogTable, todosTable, todoAuditLogTable } from "@/db/schema";
import { revalidatePath } from "next/cache";
import {
  createCustomerSchema,
  updateCustomerSchema,
  updateCustomerWithOptionalNoteSchema,
  addNoteSchema,
  updateNoteSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type UpdateCustomerWithOptionalNoteInput,
  type AddNoteInput,
  type UpdateNoteInput,
} from "@/lib/validations/customers";
import { eq, and, desc, gte, lte, between, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { logCustomerCreate, logCustomerUpdate, logCustomerArchive, logCustomerNoteCreate, logCustomerNoteUpdate } from "@/db/audit";
import OpenAI from "openai";

export async function createCustomer(data: CreateCustomerInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = createCustomerSchema.parse(data);

  const customerData = {
    name: validatedData.name,
    lastPatchDate: validatedData.lastPatchDate || null,
    lastPatchVersion: validatedData.lastPatchVersion || null,
    temperament: validatedData.temperament,
    topology: validatedData.topology,
    dumbledoreStage: validatedData.dumbledoreStage,
    patchFrequency: validatedData.patchFrequency,
    workLoad: validatedData.workLoad,
    cloudManager: validatedData.cloudManager,
    products: validatedData.products,
    mscUrl: validatedData.mscUrl || null,
    topologyStub: validatedData.topologyStub?.trim() || null,
    runbookUrl: validatedData.runbookUrl || null,
    snowUrl: validatedData.snowUrl || null,
    userId,
  };

  const result = await db.insert(customersTable).values(customerData).returning();

  // Log the customer creation
  if (result.length > 0) {
    await logCustomerCreate(result[0].id, customerData, userId);
  }

  revalidatePath("/dashboard");

  return { success: true };
}

// Zod schema for toggling archive status
const toggleArchiveSchema = z.object({
  customerId: z.number().positive(),
  archived: z.boolean(),
});

type ToggleArchiveInput = z.infer<typeof toggleArchiveSchema>;

export async function toggleArchiveCustomer(data: ToggleArchiveInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = toggleArchiveSchema.parse(data);

  // Update the customer's archived status, but only if they own it
  const result = await db
    .update(customersTable)
    .set({
      archived: validatedData.archived,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customersTable.id, validatedData.customerId),
        eq(customersTable.userId, userId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Log the archive/unarchive action
  await logCustomerArchive(validatedData.customerId, validatedData.archived, userId);

  revalidatePath("/dashboard");

  return { success: true };
}

export async function updateCustomer(data: UpdateCustomerInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = updateCustomerSchema.parse(data);

  // Fetch the old customer data first for audit logging
  const oldCustomer = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, validatedData.id),
        eq(customersTable.userId, userId)
      )
    );

  if (oldCustomer.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  const updateData = {
    name: validatedData.name,
    lastPatchDate: validatedData.lastPatchDate || null,
    lastPatchVersion: validatedData.lastPatchVersion || null,
    temperament: validatedData.temperament,
    topology: validatedData.topology,
    dumbledoreStage: validatedData.dumbledoreStage,
    patchFrequency: validatedData.patchFrequency,
    workLoad: validatedData.workLoad,
    cloudManager: validatedData.cloudManager,
    products: validatedData.products,
    mscUrl: validatedData.mscUrl || null,
    topologyStub: validatedData.topologyStub?.trim() || null,
    runbookUrl: validatedData.runbookUrl || null,
    snowUrl: validatedData.snowUrl || null,
    updatedAt: new Date(),
  };

  // Update the customer, but only if they own it
  const result = await db
    .update(customersTable)
    .set(updateData)
    .where(
      and(
        eq(customersTable.id, validatedData.id),
        eq(customersTable.userId, userId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Log the changes to the audit log
  await logCustomerUpdate(validatedData.id, oldCustomer[0], updateData, userId);

  revalidatePath("/dashboard");

  return { success: true };
}

function noteHtmlHasText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

/**
 * Updates the customer and optionally adds a note, with a single dashboard revalidation.
 * Use this from the customer detail modal instead of calling `updateCustomer` + `addNote`.
 */
export async function updateCustomerWithOptionalNote(
  data: UpdateCustomerWithOptionalNoteInput,
) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const validatedData = updateCustomerWithOptionalNoteSchema.parse(data);

  const oldCustomer = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, validatedData.id),
        eq(customersTable.userId, userId),
      ),
    );

  if (oldCustomer.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  const updateData = {
    name: validatedData.name,
    lastPatchDate: validatedData.lastPatchDate || null,
    lastPatchVersion: validatedData.lastPatchVersion || null,
    temperament: validatedData.temperament,
    topology: validatedData.topology,
    dumbledoreStage: validatedData.dumbledoreStage,
    patchFrequency: validatedData.patchFrequency,
    workLoad: validatedData.workLoad,
    cloudManager: validatedData.cloudManager,
    products: validatedData.products,
    mscUrl: validatedData.mscUrl || null,
    topologyStub: validatedData.topologyStub?.trim() || null,
    runbookUrl: validatedData.runbookUrl || null,
    snowUrl: validatedData.snowUrl || null,
    updatedAt: new Date(),
  };

  const result = await db
    .update(customersTable)
    .set(updateData)
    .where(
      and(
        eq(customersTable.id, validatedData.id),
        eq(customersTable.userId, userId),
      ),
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  await logCustomerUpdate(validatedData.id, oldCustomer[0], updateData, userId);

  const noteBody = validatedData.note;
  if (noteBody !== undefined && noteHtmlHasText(noteBody)) {
    const noteData = {
      customerId: validatedData.id,
      note: noteBody,
      userId,
    };

    const noteResult = await db
      .insert(customerNotesTable)
      .values(noteData)
      .returning();

    if (noteResult.length > 0) {
      await logCustomerNoteCreate(noteResult[0].id, noteData, userId);
    }

    await db
      .update(customersTable)
      .set({ updatedAt: new Date() })
      .where(eq(customersTable.id, validatedData.id));
  }

  revalidatePath("/dashboard");

  return { success: true };
}

export async function addNote(data: AddNoteInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = addNoteSchema.parse(data);

  // Verify the customer belongs to this user before adding note
  const customer = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, validatedData.customerId),
        eq(customersTable.userId, userId)
      )
    );

  if (customer.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Add the note
  const noteData = {
    customerId: validatedData.customerId,
    note: validatedData.note,
    userId,
  };

  const result = await db.insert(customerNotesTable).values(noteData).returning();

  // Log the note creation
  if (result.length > 0) {
    await logCustomerNoteCreate(result[0].id, noteData, userId);
  }

  // Update the customer's updatedAt timestamp
  await db
    .update(customersTable)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(customersTable.id, validatedData.customerId));

  revalidatePath("/dashboard");

  return { success: true };
}

export async function updateNote(data: UpdateNoteInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = updateNoteSchema.parse(data);

  // Verify the note belongs to this user
  const existingNote = await db
    .select()
    .from(customerNotesTable)
    .where(
      and(
        eq(customerNotesTable.id, validatedData.noteId),
        eq(customerNotesTable.userId, userId)
      )
    );

  if (existingNote.length === 0) {
    throw new Error("Note not found or unauthorized");
  }

  // Update the note
  const updateData = {
    note: validatedData.note,
  };

  const result = await db
    .update(customerNotesTable)
    .set(updateData)
    .where(
      and(
        eq(customerNotesTable.id, validatedData.noteId),
        eq(customerNotesTable.userId, userId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Failed to update note");
  }

  // Log the note update
  await logCustomerNoteUpdate(validatedData.noteId, existingNote[0], updateData, userId);

  // Update the customer's updatedAt timestamp
  await db
    .update(customersTable)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(customersTable.id, existingNote[0].customerId));

  revalidatePath("/dashboard");

  return { success: true };
}

export async function getCustomerNotes(customerId: number) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify the customer belongs to this user
  const customer = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, customerId),
        eq(customersTable.userId, userId)
      )
    );

  if (customer.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Fetch all notes for this customer
  const notes = await db
    .select()
    .from(customerNotesTable)
    .where(eq(customerNotesTable.customerId, customerId))
    .orderBy(desc(customerNotesTable.createdAt));

  return notes;
}

// Zod schema for weekly report
const weeklyReportSchema = z.object({
  weekEndingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

type WeeklyReportInput = z.infer<typeof weeklyReportSchema>;

/** To-do activity for the week: opened (created), updated, or closed (completed/deleted) */
export type WeeklyReportTodoActivity = {
  opened: Array<{ title: string; createdAt: Date }>;
  updated: Array<{ title: string; createdAt: Date }>;
  closed: Array<{ title: string; closedAt: Date; action: "completed" | "deleted" }>;
};

export type WeeklyReportData = {
  customer: {
    id: number;
    name: string;
    lastPatchDate: string | null;
    lastPatchVersion: string | null;
    temperament: string;
    topology: string;
    dumbledoreStage: number;
  };
  notes: Array<{
    id: number;
    note: string;
    createdAt: Date;
  }>;
  todosActivity: WeeklyReportTodoActivity;
  executiveSummary?: string;
};

/**
 * Helper function to strip HTML from notes
 */
function stripHtml(html: string): string {
  // Simple regex-based HTML stripping for server-side use
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .trim();
}

/**
 * Generate an executive summary for a customer using OpenAI
 */
async function generateExecutiveSummary(
  customerName: string,
  customerInfo: { temperament: string },
  notes: Array<{ note: string; createdAt: Date }>,
  todosActivity: WeeklyReportTodoActivity
): Promise<string> {
  const hasNotes = notes.length > 0;
  const hasTodoActivity =
    todosActivity.opened.length > 0 ||
    todosActivity.updated.length > 0 ||
    todosActivity.closed.length > 0;

  if (!hasNotes && !hasTodoActivity) {
    return "No activity recorded for this customer during the week.";
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const notesText = hasNotes
    ? notes
        .map((note) => {
          const plainText = stripHtml(note.note);
          const date = note.createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return `[${date}] ${plainText}`;
        })
        .join("\n\n")
    : "None this week.";

  const todoLines: string[] = [];
  if (todosActivity.opened.length > 0) {
    const list = todosActivity.opened
      .map(
        (t) =>
          `- ${t.title} (opened ${t.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
      )
      .join("\n");
    todoLines.push(`To-dos opened:\n${list}`);
  }
  if (todosActivity.updated.length > 0) {
    const list = todosActivity.updated
      .map(
        (t) =>
          `- ${t.title} (updated ${t.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
      )
      .join("\n");
    todoLines.push(`To-dos updated:\n${list}`);
  }
  if (todosActivity.closed.length > 0) {
    const list = todosActivity.closed
      .map(
        (t) =>
          `- ${t.title} (${t.action} ${t.closedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
      )
      .join("\n");
    todoLines.push(`To-dos closed:\n${list}`);
  }
  const todosText = todoLines.length > 0 ? todoLines.join("\n\n") : "None this week.";

  const prompt = `You are a Customer Success Engineer (CSE) creating a weekly executive summary for management. 

Customer: ${customerName}
Customer Temperament: ${customerInfo.temperament}

Weekly Notes (this is the only source for LTS/long-term support, migration stage, environment/topology, or version details—do not infer them from anywhere else):
${notesText}

To-dos this week (opened, updated, closed):
${todosText}

Please create a concise 2-3 sentence executive summary that:
1. Highlights the most important activities and outcomes
2. Identifies any risks or blockers
3. Discusses LTS migration, patching, or environment/version only if that appears in the Weekly Notes or to-do text above—not from assumptions
4. Incorporates to-do activity (opened, updated, completed, or deleted) where relevant
5. Uses professional, business-appropriate language

Keep it brief and actionable for executive review.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional Customer Success Engineer writing executive summaries for weekly customer reports. Be concise, clear, and focus on business value. Include to-do activity (opened, updated, closed) when relevant. Do not state LTS migration stage, topology, or patch/version unless the user provided that context in the weekly notes or to-do titles.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || "Unable to generate summary.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Executive summary unavailable.";
  }
}

export async function getWeeklyReport(data: WeeklyReportInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = weeklyReportSchema.parse(data);

  // Calculate week start date (previous Monday relative to end date)
  // Parse YYYY-MM-DD format and work in UTC to avoid timezone issues
  const [year, month, day] = validatedData.weekEndingDate.split('-').map(Number);
  const weekEndDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  
  const weekStartDate = new Date(weekEndDate);
  // Get day of week in UTC (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = weekStartDate.getUTCDay();
  // Calculate days to subtract to get to Monday
  // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStartDate.setUTCDate(weekStartDate.getUTCDate() - daysToSubtract);
  weekStartDate.setUTCHours(0, 0, 0, 0);

  // Fetch all non-archived customers for this user, ordered alphabetically
  const customers = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.userId, userId),
        eq(customersTable.archived, false)
      )
    )
    .orderBy(customersTable.name);

  // Fetch notes for the week using SQL-level date filtering
  const weekNotes = await db
    .select()
    .from(customerNotesTable)
    .where(
      and(
        eq(customerNotesTable.userId, userId),
        gte(customerNotesTable.createdAt, weekStartDate),
        lte(customerNotesTable.createdAt, weekEndDate)
      )
    );

  // Fetch todo audit log for the week (left join todos for customerId/title; deleted todos have no row)
  const todoAuditRows = await db
    .select({
      action: todoAuditLogTable.action,
      createdAt: todoAuditLogTable.createdAt,
      todoId: todoAuditLogTable.todoId,
      oldValue: todoAuditLogTable.oldValue,
      newValue: todoAuditLogTable.newValue,
      customerId: todosTable.customerId,
      title: todosTable.title,
    })
    .from(todoAuditLogTable)
    .leftJoin(
      todosTable,
      and(
        eq(todoAuditLogTable.todoId, todosTable.id),
        eq(todosTable.userId, userId)
      )
    )
    .where(
      and(
        eq(todoAuditLogTable.userId, userId),
        gte(todoAuditLogTable.createdAt, weekStartDate),
        lte(todoAuditLogTable.createdAt, weekEndDate)
      )
    );

  // Helper to get title and customerId from audit row (for deleted todos, parse oldValue/newValue)
  const getTodoInfo = (
    row: (typeof todoAuditRows)[0]
  ): { title: string; customerId: number | null } => {
    if (row.title != null && row.title !== "") {
      return { title: row.title, customerId: row.customerId };
    }
    try {
      const json = row.action === "delete" ? row.oldValue : row.newValue;
      if (!json) return { title: "Untitled", customerId: row.customerId };
      const data = JSON.parse(json) as { title?: string; customerId?: number | null };
      return {
        title: typeof data.title === "string" ? data.title : "Untitled",
        customerId: data.customerId ?? row.customerId,
      };
    } catch {
      return { title: "Untitled", customerId: row.customerId };
    }
  };

  // Group todo activity by customer
  const todosByCustomer = new Map<
    number,
    WeeklyReportTodoActivity
  >();
  const emptyActivity = (): WeeklyReportTodoActivity => ({
    opened: [],
    updated: [],
    closed: [],
  });
  for (const row of todoAuditRows) {
    const { title, customerId } = getTodoInfo(row);
    if (customerId == null) continue;
    if (!todosByCustomer.has(customerId)) {
      todosByCustomer.set(customerId, emptyActivity());
    }
    const act = todosByCustomer.get(customerId)!;
    const createdAt = new Date(row.createdAt);
    if (row.action === "create") {
      act.opened.push({ title, createdAt });
    } else if (row.action === "update") {
      act.updated.push({ title, createdAt });
    } else if (row.action === "complete" || row.action === "delete") {
      act.closed.push({
        title,
        closedAt: createdAt,
        action: row.action === "complete" ? "completed" : "deleted",
      });
    }
    // "uncomplete" is not counted as opened/closed for the report
  }

  // Build report data with AI-generated summaries
  const reportData: WeeklyReportData[] = await Promise.all(
    customers.map(async (customer) => {
      const customerNotes = weekNotes
        .filter((note) => note.customerId === customer.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const todosActivity = todosByCustomer.get(customer.id) ?? emptyActivity();

      const executiveSummary = await generateExecutiveSummary(
        customer.name,
        { temperament: customer.temperament },
        customerNotes.map((note) => ({
          note: note.note,
          createdAt: note.createdAt,
        })),
        todosActivity
      );

      return {
        customer: {
          id: customer.id,
          name: customer.name,
          lastPatchDate: customer.lastPatchDate,
          lastPatchVersion: customer.lastPatchVersion,
          temperament: customer.temperament,
          topology: customer.topology,
          dumbledoreStage: customer.dumbledoreStage,
        },
        notes: customerNotes.map((note) => ({
          id: note.id,
          note: note.note,
          createdAt: note.createdAt,
        })),
        todosActivity,
        executiveSummary,
      };
    })
  );

  return reportData;
}

// Zod schema for audit history query
const getAuditHistorySchema = z.object({
  customerId: z.number().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
});

type GetAuditHistoryInput = z.infer<typeof getAuditHistorySchema>;

export type AuditHistoryEntry = {
  id: number;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  userId: string;
};

/**
 * Get audit history for a customer
 * Optionally filter by date range
 */
export async function getCustomerAuditHistory(data: GetAuditHistoryInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = getAuditHistorySchema.parse(data);

  // Verify the customer belongs to this user
  const customer = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, validatedData.customerId),
        eq(customersTable.userId, userId)
      )
    );

  if (customer.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Build the query with optional date filters
  let query = db
    .select()
    .from(customerAuditLogTable)
    .where(eq(customerAuditLogTable.customerId, validatedData.customerId));

  // Apply date filters if provided
  const conditions = [eq(customerAuditLogTable.customerId, validatedData.customerId)];

  if (validatedData.startDate) {
    const [year, month, day] = validatedData.startDate.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    conditions.push(gte(customerAuditLogTable.createdAt, startDate));
  }

  if (validatedData.endDate) {
    const [year, month, day] = validatedData.endDate.split('-').map(Number);
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    conditions.push(lte(customerAuditLogTable.createdAt, endDate));
  }

  // Fetch audit log entries
  const auditEntries = await db
    .select()
    .from(customerAuditLogTable)
    .where(and(...conditions))
    .orderBy(desc(customerAuditLogTable.createdAt));

  return auditEntries.map(entry => ({
    id: entry.id,
    action: entry.action,
    fieldName: entry.fieldName,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    createdAt: entry.createdAt,
    userId: entry.userId,
  }));
}

export async function getTodosByCustomer(customerId: number) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify customer ownership
  const customer = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, customerId),
        eq(customersTable.userId, userId)
      )
    );

  if (customer.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Get todos for this customer
  const todos = await db
    .select()
    .from(todosTable)
    .where(
      and(
        eq(todosTable.customerId, customerId),
        eq(todosTable.userId, userId),
        isNotNull(todosTable.noteId)
      )
    );

  return todos;
}

export async function getAllUsers() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    const client = await clerkClient();
    const users = await client.users.getUserList();

    return users.data.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddress: user.emailAddresses[0]?.emailAddress,
      imageUrl: user.imageUrl,
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}
