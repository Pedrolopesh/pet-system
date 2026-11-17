-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('petshop', 'creche', 'clinica');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('teste', 'basico', 'pro');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('dono', 'gerente', 'atendente');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('agendado', 'confirmado', 'em_atendimento', 'pronto', 'concluido', 'cancelado', 'faltou');

-- CreateEnum
CREATE TYPE "NotePriority" AS ENUM ('urgente', 'importante', 'normal');

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "priority" "NotePriority" NOT NULL DEFAULT 'normal';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "duration_minutes" INTEGER;

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "business_types" "BusinessType"[] DEFAULT ARRAY['petshop']::"BusinessType"[],
ADD COLUMN     "closes_at" VARCHAR(5) NOT NULL DEFAULT '19:00',
ADD COLUMN     "opens_at" VARCHAR(5) NOT NULL DEFAULT '08:00',
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'teste',
ADD COLUMN     "trial_ends_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'dono';

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "employee_id" UUID,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'agendado',
    "price" INTEGER NOT NULL,
    "notes" VARCHAR(500) NOT NULL DEFAULT '',
    "sale_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointments_shop_id_starts_at_idx" ON "appointments"("shop_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_employee_id_starts_at_idx" ON "appointments"("employee_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_hash_key" ON "invites"("token_hash");

-- CreateIndex
CREATE INDEX "invites_shop_id_idx" ON "invites"("shop_id");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
