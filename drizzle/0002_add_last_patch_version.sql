-- Migration: Add Last Patch Version column
-- Add lastPatchVersion to track the patch version applied

ALTER TABLE "customers" ADD COLUMN "last_patch_version" varchar(100);
