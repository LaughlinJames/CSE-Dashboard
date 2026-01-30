-- Migration: Update LTS status to Topology and Dumbledore Stage
-- Drop old ltsStatus column and add new topology and dumbledoreStage columns

ALTER TABLE "customers" DROP COLUMN "ltsStatus";
ALTER TABLE "customers" ADD COLUMN "topology" varchar(20) DEFAULT 'dev' NOT NULL;
ALTER TABLE "customers" ADD COLUMN "dumbledore_stage" integer DEFAULT 1 NOT NULL;
