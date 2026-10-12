-- CreateIndex
CREATE INDEX "reservations_resourceId_status_startTime_idx" ON "reservations"("resourceId", "status", "startTime");
