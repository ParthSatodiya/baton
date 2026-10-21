-- A task's last note now travels with it: carry-forward copies the newest
-- note an earlier day wrote, so one quiet day (or a day on leave) no longer
-- hides it.

-- AlterTable
ALTER TABLE "StandupItem" ADD COLUMN "lastNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StandupItem" ADD COLUMN "lastNoteDate" TEXT NOT NULL DEFAULT '';

-- Backfill one hop, which is what the board showed before, so nobody's
-- note disappears on deploy. Later carries build on it from here.
UPDATE "StandupItem" SET
    "lastNote" = (SELECT p."comment" FROM "StandupItem" p WHERE p."id" = "StandupItem"."carriedFromId"),
    "lastNoteDate" = (
        SELECT s."date" FROM "StandupItem" p JOIN "Standup" s ON s."id" = p."standupId"
        WHERE p."id" = "StandupItem"."carriedFromId"
    )
WHERE "carriedFromId" IS NOT NULL
  AND (SELECT p."comment" FROM "StandupItem" p WHERE p."id" = "StandupItem"."carriedFromId") != '';
