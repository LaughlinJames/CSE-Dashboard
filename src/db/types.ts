import { usersTable } from './schema';

// Type for inserting a new user (without auto-generated fields)
export type InsertUser = typeof usersTable.$inferInsert;

// Type for selecting a user (with all fields including auto-generated ones)
export type SelectUser = typeof usersTable.$inferSelect;
