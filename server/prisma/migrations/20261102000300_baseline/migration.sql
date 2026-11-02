CREATE TABLE "RoomStream" (
    "roomId" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "catalogDocument" TEXT,
    "emptySince" DATETIME
);
CREATE TABLE "RoomProductImage" (
    "roomId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "digest" TEXT,
    "content" BLOB,
    "externalUrl" TEXT,
    PRIMARY KEY ("roomId", "restaurantId", "productId"),
    CONSTRAINT "RoomProductImage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "RoomStream" ("roomId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "RoomBatch" (
    "batchId" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "previousVersion" INTEGER NOT NULL,
    "fromVersion" INTEGER NOT NULL,
    "toVersion" INTEGER NOT NULL,
    "document" TEXT NOT NULL,
    CONSTRAINT "RoomBatch_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "RoomStream" ("roomId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "RoomEvent" (
    "roomId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "batchId" TEXT NOT NULL,
    "batchIndex" INTEGER NOT NULL,
    "document" TEXT NOT NULL,
    PRIMARY KEY ("roomId", "version"),
    CONSTRAINT "RoomEvent_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RoomBatch" ("batchId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RoomStream_code_key" ON "RoomStream"("code");
CREATE INDEX "RoomStream_emptySince_idx" ON "RoomStream"("emptySince");
CREATE UNIQUE INDEX "RoomBatch_roomId_fromVersion_key" ON "RoomBatch"("roomId", "fromVersion");
CREATE UNIQUE INDEX "RoomEvent_batchId_batchIndex_key" ON "RoomEvent"("batchId", "batchIndex");
