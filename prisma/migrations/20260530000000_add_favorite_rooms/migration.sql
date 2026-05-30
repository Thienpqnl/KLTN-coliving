-- CreateTable
CREATE TABLE "FavoriteRoom" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteRoom_userId_idx" ON "FavoriteRoom"("userId");

-- CreateIndex
CREATE INDEX "FavoriteRoom_roomId_idx" ON "FavoriteRoom"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoom_userId_roomId_key" ON "FavoriteRoom"("userId", "roomId");

-- AddForeignKey
ALTER TABLE "FavoriteRoom" ADD CONSTRAINT "FavoriteRoom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteRoom" ADD CONSTRAINT "FavoriteRoom_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
