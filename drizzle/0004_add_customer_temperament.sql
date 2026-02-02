-- Migration: Add Customer Temperament column
-- Add temperament to track customer satisfaction level

ALTER TABLE "customers" ADD COLUMN "temperament" varchar(20) DEFAULT 'neutral' NOT NULL;
