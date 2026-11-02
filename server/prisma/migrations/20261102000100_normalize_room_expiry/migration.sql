-- Prisma's SQLite DateTime values use epoch milliseconds; normalize migrated SQL timestamps.
UPDATE "RoomStream"
SET "emptySince" = CAST((julianday("emptySince") - 2440587.5) * 86400000 AS INTEGER)
WHERE typeof("emptySince") = 'text';
