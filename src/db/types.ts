import { customersTable, customerNotesTable, customerAuditLogTable } from './schema';

// Customer types
export type InsertCustomer = typeof customersTable.$inferInsert;
export type SelectCustomer = typeof customersTable.$inferSelect;

// Customer Note types
export type InsertCustomerNote = typeof customerNotesTable.$inferInsert;
export type SelectCustomerNote = typeof customerNotesTable.$inferSelect;

// Customer Audit Log types
export type InsertCustomerAuditLog = typeof customerAuditLogTable.$inferInsert;
export type SelectCustomerAuditLog = typeof customerAuditLogTable.$inferSelect;
