-- CreateEnum
CREATE TYPE "DentalVisitStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "DentalVisit" (
    "id" SERIAL NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "dentistId" INTEGER NOT NULL,
    "status" "DentalVisitStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformedProcedure" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "treatmentPlanItemId" INTEGER,
    "notes" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformedProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DentalVisit_appointmentId_key" ON "DentalVisit"("appointmentId");
CREATE INDEX "DentalVisit_patientId_startedAt_idx" ON "DentalVisit"("patientId", "startedAt");
CREATE INDEX "DentalVisit_dentistId_startedAt_idx" ON "DentalVisit"("dentistId", "startedAt");
CREATE INDEX "DentalVisit_status_startedAt_idx" ON "DentalVisit"("status", "startedAt");
CREATE UNIQUE INDEX "PerformedProcedure_visitId_treatmentPlanItemId_key" ON "PerformedProcedure"("visitId", "treatmentPlanItemId");
CREATE INDEX "PerformedProcedure_serviceId_idx" ON "PerformedProcedure"("serviceId");

-- AddForeignKey
ALTER TABLE "DentalVisit" ADD CONSTRAINT "DentalVisit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalVisit" ADD CONSTRAINT "DentalVisit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DentalVisit" ADD CONSTRAINT "DentalVisit_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerformedProcedure" ADD CONSTRAINT "PerformedProcedure_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "DentalVisit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerformedProcedure" ADD CONSTRAINT "PerformedProcedure_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "DentalService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerformedProcedure" ADD CONSTRAINT "PerformedProcedure_treatmentPlanItemId_fkey" FOREIGN KEY ("treatmentPlanItemId") REFERENCES "TreatmentPlanItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
