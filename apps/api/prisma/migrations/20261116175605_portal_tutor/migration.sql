-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('balcao', 'online');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "source" "AppointmentSource" NOT NULL DEFAULT 'balcao';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "online_booking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "performer_role" "Role";

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "booking_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "booking_notice_hours" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "booking_window_days" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "cancel_notice_hours" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "slug" VARCHAR(40);

-- CreateTable
CREATE TABLE "tutor_login_codes" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutor_login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tutor_login_codes_shop_id_email_created_at_idx" ON "tutor_login_codes"("shop_id", "email", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");

-- AddForeignKey
ALTER TABLE "tutor_login_codes" ADD CONSTRAINT "tutor_login_codes_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

