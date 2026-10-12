-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "resources_isActive_name_idx" ON "resources"("isActive", "name");

-- CreateIndex
CREATE INDEX "reservations_resourceId_startTime_idx" ON "reservations"("resourceId", "startTime");

-- CreateIndex
CREATE INDEX "reservations_userId_createdAt_idx" ON "reservations"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Enable GiST equality support for integer resource IDs.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A reservation must end after it starts.
ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_valid_time_check"
CHECK ("endTime" > "startTime");

-- A resource cannot have overlapping active reservations.
ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_no_overlapping_active_bookings"
EXCLUDE USING GIST (
    "resourceId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
)
WHERE ("status" IN ('PENDING', 'CONFIRMED'));

