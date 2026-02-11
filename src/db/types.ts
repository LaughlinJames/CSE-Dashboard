import { customersTable, customerNotesTable, customerAuditLogTable, customerNoteAuditLogTable, todosTable, todoAuditLogTable } from './schema';

// Customer types
export type InsertCustomer = typeof customersTable.$inferInsert;
export type SelectCustomer = typeof customersTable.$inferSelect;

// Customer Note types
export type InsertCustomerNote = typeof customerNotesTable.$inferInsert;
export type SelectCustomerNote = typeof customerNotesTable.$inferSelect;

// Customer Audit Log types
export type InsertCustomerAuditLog = typeof customerAuditLogTable.$inferInsert;
export type SelectCustomerAuditLog = typeof customerAuditLogTable.$inferSelect;

// Customer Note Audit Log types
export type InsertCustomerNoteAuditLog = typeof customerNoteAuditLogTable.$inferInsert;
export type SelectCustomerNoteAuditLog = typeof customerNoteAuditLogTable.$inferSelect;

// Todo types
export type InsertTodo = typeof todosTable.$inferInsert;
export type SelectTodo = typeof todosTable.$inferSelect;

// Todo Audit Log types
export type InsertTodoAuditLog = typeof todoAuditLogTable.$inferInsert;
export type SelectTodoAuditLog = typeof todoAuditLogTable.$inferSelect;
