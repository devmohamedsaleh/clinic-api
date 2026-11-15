/*
  Warnings:

  - The primary key for the `DentalService` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `DentalService` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Dentist` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Dentist` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `DentistService` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `dentistId` on the `DentistService` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `serviceId` on the `DentistService` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "DentistService" DROP CONSTRAINT "DentistService_dentistId_fkey";

-- DropForeignKey
ALTER TABLE "DentistService" DROP CONSTRAINT "DentistService_serviceId_fkey";

-- AlterTable
ALTER TABLE "DentalService" DROP CONSTRAINT "DentalService_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "DentalService_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Dentist" DROP CONSTRAINT "Dentist_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Dentist_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "DentistService" DROP CONSTRAINT "DentistService_pkey",
DROP COLUMN "dentistId",
ADD COLUMN     "dentistId" INTEGER NOT NULL,
DROP COLUMN "serviceId",
ADD COLUMN     "serviceId" INTEGER NOT NULL,
ADD CONSTRAINT "DentistService_pkey" PRIMARY KEY ("dentistId", "serviceId");

-- AddForeignKey
ALTER TABLE "DentistService" ADD CONSTRAINT "DentistService_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentistService" ADD CONSTRAINT "DentistService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "DentalService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
