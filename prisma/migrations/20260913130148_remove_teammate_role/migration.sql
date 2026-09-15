-- The Teammate role is removed. The app now has two roles: super admin and
-- inventory manager. Reading the inventory never needed an account.
--
-- A Postgres enum cannot drop a value that rows still use, so any remaining
-- teammate accounts are converted first. They become inventory managers but
-- are disabled at the same time: removing a role must never quietly give
-- someone more power than they had. A super admin can re-enable an account
-- deliberately from the Team page.
UPDATE "User"
SET "role" = 'INVENTORY_MANAGER', "isActive" = false
WHERE "role" = 'TEAMMATE';

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'INVENTORY_MANAGER');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'INVENTORY_MANAGER';
COMMIT;
