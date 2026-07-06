-- AlterTable: real login-activity tracking for the admin "All Users" list,
-- which previously showed updatedAt (bumped by any profile/admin edit, not
-- actual login activity) as "last active".
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- AlterTable: real stage-entry tracking for the admin Author Projects
-- Kanban's "days in current stage", which previously used createdAt (days
-- since the project was created, not since it entered its current stage).
-- Existing rows backfill to "now" — their true historical stage-entry time
-- isn't recoverable, so they start counting fresh from this migration.
ALTER TABLE "AuthorProject" ADD COLUMN     "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
