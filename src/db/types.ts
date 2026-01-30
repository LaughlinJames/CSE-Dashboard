import { customersTable, customerNotesTable } from './schema';

// Customer types
export type InsertCustomer = typeof customersTable.$inferInsert;
export type SelectCustomer = typeof customersTable.$inferSelect;

// Customer Note types
export type InsertCustomerNote = typeof customerNotesTable.$inferInsert;
export type SelectCustomerNote = typeof customerNotesTable.$inferSelect;
