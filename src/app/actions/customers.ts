"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { customersTable, customerNotesTable, customerAuditLogTable, customerNoteAuditLogTable, todosTable } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { 
  createCustomerSchema, 
  updateCustomerSchema,
  addNoteSchema,
  updateNoteSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type AddNoteInput,
  type UpdateNoteInput
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
  customerInfo: {
    topology: string;
    dumbledoreStage: number;
    temperament: string;
    lastPatchVersion: string | null;
  },
  notes: Array<{ note: string; createdAt: Date }>
): Promise<string> {
  // If no notes, return a default message
  if (notes.length === 0) {
    return "No activity recorded for this customer during the week.";
  }

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Prepare notes text
  const notesText = notes
    .map((note, idx) => {
      const plainText = stripHtml(note.note);
      const date = note.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `[${date}] ${plainText}`;
    })
    .join("\n\n");

  // Create the prompt
  const prompt = `You are a Customer Success Engineer (CSE) creating a weekly executive summary for management. 

Customer: ${customerName}
Environment: ${customerInfo.topology.toUpperCase()}
LTS Migration Stage: Stage ${customerInfo.dumbledoreStage}
Current Version: ${customerInfo.lastPatchVersion || "Unknown"}
Customer Temperament: ${customerInfo.temperament}

Weekly Notes:
${notesText}

Please create a concise 2-3 sentence executive summary that:
1. Highlights the most important activities and outcomes
2. Identifies any risks or blockers
3. Notes progress on LTS migration if mentioned
4. Uses professional, business-appropriate language

Keep it brief and actionable for executive review.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional Customer Success Engineer writing executive summaries for weekly customer reports. Be concise, clear, and focus on business value.",
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

  // Build report data with AI-generated summaries
  const reportData: WeeklyReportData[] = await Promise.all(
    customers.map(async (customer) => {
      const customerNotes = weekNotes
        .filter(note => note.customerId === customer.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Generate executive summary using OpenAI
      const executiveSummary = await generateExecutiveSummary(
        customer.name,
        {
          topology: customer.topology,
          dumbledoreStage: customer.dumbledoreStage,
          temperament: customer.temperament,
          lastPatchVersion: customer.lastPatchVersion,
        },
        customerNotes.map(note => ({
          note: note.note,
          createdAt: note.createdAt,
        }))
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
        notes: customerNotes.map(note => ({
          id: note.id,
          note: note.note,
          createdAt: note.createdAt,
        })),
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
