-- Optional photos for items, and a person to ask about items that have no
-- storage location yet.

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "holderId" TEXT;

-- CreateTable
CREATE TABLE "ToolPhoto" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "thumb" BYTEA NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolPhoto_toolId_key" ON "ToolPhoto"("toolId");

-- CreateIndex
CREATE INDEX "Tool_holderId_idx" ON "Tool"("holderId");

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolPhoto" ADD CONSTRAINT "ToolPhoto_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolPhoto" ADD CONSTRAINT "ToolPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Items already sitting without a location get the person who added them
-- as the one to ask, so none of them shows up with no name at all.
UPDATE "Tool" SET "holderId" = "createdById" WHERE "storageLocationId" IS NULL AND "holderId" IS NULL;
