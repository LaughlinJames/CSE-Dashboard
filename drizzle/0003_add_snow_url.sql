-- Migration: Add SNOW URL column
-- Add snowUrl to track SNOW links for customers

ALTER TABLE "customers" ADD COLUMN "snow_url" text;
