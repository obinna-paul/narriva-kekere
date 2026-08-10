-- The completion bonus was retired: no code ever granted it, and the app no
-- longer has any such feature. Remove the vestigial platform setting so it
-- stops implying a reward that never pays out.
--
-- The COMPLETION_BONUS TransactionType enum value is deliberately left in
-- place (nothing writes it, so no rows carry it) — dropping a Postgres enum
-- value needs a risky full-type-rewrite for no functional gain.
DELETE FROM "PlatformSetting" WHERE "key" = 'completion_bonus_cowries';
