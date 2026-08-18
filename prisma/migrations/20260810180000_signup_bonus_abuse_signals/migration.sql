-- Anti-abuse signals for the signup bonus: a canonical email (to dedupe the
-- free grant per real inbox) and the signup IP (a soft, withhold-only
-- velocity signal). Neither is unique-constrained — the bonus gate checks
-- them in application code, and pre-existing alias pairs are grandfathered.
ALTER TABLE "User" ADD COLUMN "canonicalEmail" TEXT;
ALTER TABLE "User" ADD COLUMN "signupIp" TEXT;

-- Best-effort backfill for existing rows: lowercase and strip any "+tag"
-- from the local part (domain-agnostic, catches the common plus-addressing
-- trick). The Gmail/Googlemail dot-collapsing is deliberately NOT done here
-- (it needs per-provider logic) — new signups get the full canonical form in
-- app code; this backfill only needs to be good enough to seed existing rows.
UPDATE "User"
SET "canonicalEmail" =
  lower(split_part(split_part("email", '@', 1), '+', 1) || '@' || split_part("email", '@', 2))
WHERE "email" LIKE '%@%';

CREATE INDEX "User_canonicalEmail_idx" ON "User"("canonicalEmail");
