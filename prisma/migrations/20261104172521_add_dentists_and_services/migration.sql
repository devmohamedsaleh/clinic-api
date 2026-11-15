/*
  Warnings:

  - You are about to drop the column `description` on the `DentalService` table. All the data in the column will be lost.
  - You are about to drop the column `licenseNo` on the `Dentist` table. All the data in the column will be lost.
  - You are about to drop the column `specialty` on the `Dentist` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Dentist_licenseNo_key";

-- AlterTable
ALTER TABLE "DentalService" DROP COLUMN "description";

-- AlterTable
ALTER TABLE "Dentist" DROP COLUMN "licenseNo",
DROP COLUMN "specialty";
