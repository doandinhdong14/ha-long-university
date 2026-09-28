-- CreateTable
CREATE TABLE "PhuLucV" (
    "id" TEXT NOT NULL,
    "kyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "guiLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhuLucV_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhuLucV_fileId_key" ON "PhuLucV"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "PhuLucV_kyId_userId_key" ON "PhuLucV"("kyId", "userId");

-- AddForeignKey
ALTER TABLE "PhuLucV" ADD CONSTRAINT "PhuLucV_kyId_fkey" FOREIGN KEY ("kyId") REFERENCES "Ky"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhuLucV" ADD CONSTRAINT "PhuLucV_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhuLucV" ADD CONSTRAINT "PhuLucV_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileDinhKem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
