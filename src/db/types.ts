import { customersTable, customerNotesTable, customerAuditLogTable, todosTable, todoAuditLogTable } from './schema';

// Customer types
export type InsertCustomer = typeof customersTable.$inferInsert;
export type SelectCustomer = typeof customersTable.$inferSelect;

// Customer Note types
export type InsertCustomerNote = typeof customerNotesTable.$inferInsert;
export type SelectCustomerNote = typeof customerNotesTable.$inferSelect;

// Customer Audit Log types
export type InsertCustomerAuditLog = typeof customerAuditLogTable.$inferInsert;
export type SelectCustomerAuditLog = typeof customerAuditLogTable.$inferSelect;

// Todo types
export type InsertTodo = typeof todosTable.$inferInsert;
export type SelectTodo = typeof todosTable.$inferSelect;

// Todo Audit Log types
export type InsertTodoAuditLog = typeof todoAuditLogTable.$inferInsert;
export type SelectTodoAuditLog = typeof todoAuditLogTable.$inferSelect;
