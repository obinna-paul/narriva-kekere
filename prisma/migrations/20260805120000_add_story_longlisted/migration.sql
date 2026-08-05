-- Marks a story as a live competition entry, so its cover can carry the
-- "Longlist" badge. Set when the story is entered into a competition and
-- cleared for every entry once that competition goes COMPLETE.
--
-- Denormalized on purpose — see the column comment in schema.prisma for why
-- this isn't derived from the CompetitionEntry join.
ALTER TABLE "Story" ADD COLUMN "longlisted" BOOLEAN NOT NULL DEFAULT false;
