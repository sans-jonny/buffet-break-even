ALTER TABLE "RoomStream" ADD COLUMN "emptySince" DATETIME;
UPDATE "RoomStream" SET "emptySince" = CURRENT_TIMESTAMP;
CREATE INDEX "RoomStream_emptySince_idx" ON "RoomStream"("emptySince");
