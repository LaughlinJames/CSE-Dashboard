-- Migration: Add Patch Frequency column
-- Add patch_frequency to track whether customer is patched monthly or quarterly

ALTER TABLE "customers" ADD COLUMN "patch_frequency" varchar(20) DEFAULT 'monthly' NOT NULL;
