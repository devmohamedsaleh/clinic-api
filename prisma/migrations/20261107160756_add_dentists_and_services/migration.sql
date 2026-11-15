/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Dentist` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Dentist" ADD COLUMN     "specialty" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Dentist_phone_key" ON "Dentist"("phone");

-- CreateIndex
CREATE INDEX "Dentist_name_idx" ON "Dentist"("name");

-- CreateIndex
CREATE INDEX "DentistService_serviceId_idx" ON "DentistService"("serviceId");
