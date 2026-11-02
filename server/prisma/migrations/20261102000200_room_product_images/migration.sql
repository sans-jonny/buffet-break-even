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
