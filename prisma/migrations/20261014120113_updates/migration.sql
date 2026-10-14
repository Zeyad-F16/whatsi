/*
  Warnings:

  - Made the column `updated_at` on table `customer_profiles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "customer_profiles" ALTER COLUMN "updated_at" SET NOT NULL;
