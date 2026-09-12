-- AlterTable
ALTER TABLE "StorageLocation" ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "detailHint" TEXT,
ADD COLUMN     "detailLabel" TEXT,
ADD COLUMN     "detailRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "locationDetail" TEXT;
