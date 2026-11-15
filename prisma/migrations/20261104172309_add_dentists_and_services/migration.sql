-- CreateTable
CREATE TABLE "Dentist" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "phone" TEXT,
    "licenseNo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dentist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentalService" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DentistService" (
    "dentistId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,

    CONSTRAINT "DentistService_pkey" PRIMARY KEY ("dentistId","serviceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dentist_licenseNo_key" ON "Dentist"("licenseNo");

-- CreateIndex
CREATE UNIQUE INDEX "DentalService_name_key" ON "DentalService"("name");

-- AddForeignKey
ALTER TABLE "DentistService" ADD CONSTRAINT "DentistService_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentistService" ADD CONSTRAINT "DentistService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "DentalService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
