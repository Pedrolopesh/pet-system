-- CreateEnum
CREATE TYPE "PetSex" AS ENUM ('macho', 'femea');

-- CreateEnum
CREATE TYPE "RecordKind" AS ENUM ('consulta', 'retorno', 'vacinacao', 'emergencia', 'procedimento');

-- AlterTable
ALTER TABLE "pets" ADD COLUMN     "allergies" VARCHAR(300) NOT NULL DEFAULT '',
ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "neutered" BOOLEAN,
ADD COLUMN     "sex" "PetSex";

-- CreateTable
CREATE TABLE "medical_records" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "vet_id" UUID,
    "author_id" UUID,
    "appointment_id" UUID,
    "kind" "RecordKind" NOT NULL DEFAULT 'consulta',
    "at" TIMESTAMPTZ NOT NULL,
    "weight_grams" INTEGER,
    "temperature_deci" INTEGER,
    "complaint" VARCHAR(2000) NOT NULL DEFAULT '',
    "exam" VARCHAR(4000) NOT NULL DEFAULT '',
    "diagnosis" VARCHAR(2000) NOT NULL DEFAULT '',
    "treatment" VARCHAR(4000) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "medication" VARCHAR(120) NOT NULL,
    "dosage" VARCHAR(120) NOT NULL DEFAULT '',
    "frequency" VARCHAR(120) NOT NULL DEFAULT '',
    "duration" VARCHAR(120) NOT NULL DEFAULT '',
    "instructions" VARCHAR(500) NOT NULL DEFAULT '',

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccinations" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "record_id" UUID,
    "vet_id" UUID,
    "vaccine" VARCHAR(80) NOT NULL,
    "applied_at" DATE NOT NULL,
    "next_dose_at" DATE,
    "batch" VARCHAR(40) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medical_records_pet_id_at_idx" ON "medical_records"("pet_id", "at");

-- CreateIndex
CREATE INDEX "prescription_items_record_id_idx" ON "prescription_items"("record_id");

-- CreateIndex
CREATE INDEX "vaccinations_shop_id_next_dose_at_idx" ON "vaccinations"("shop_id", "next_dose_at");

-- CreateIndex
CREATE INDEX "vaccinations_pet_id_applied_at_idx" ON "vaccinations"("pet_id", "applied_at");

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_vet_id_fkey" FOREIGN KEY ("vet_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_vet_id_fkey" FOREIGN KEY ("vet_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
