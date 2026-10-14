-- Allow tasks without a primary project
ALTER TABLE "tasks" ALTER COLUMN "project_id" DROP NOT NULL;
