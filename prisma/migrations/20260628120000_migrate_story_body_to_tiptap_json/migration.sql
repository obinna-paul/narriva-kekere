-- Story.body: TEXT (paragraphs joined by "\n\n") -> Json (Tiptap document).
-- Every existing paragraph gets a stable attrs.id so later phases (paragraph
-- comments/reactions) have something to key off of from day one.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "Story" ADD COLUMN "bodyVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Story" ADD COLUMN "wordCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Story" ADD COLUMN "bodyJson" JSONB;

-- Convert each row's plain-text body into a Tiptap doc and backfill wordCount
-- in the same pass, before the old column is dropped.
UPDATE "Story"
SET
  "bodyJson" = (
    SELECT jsonb_build_object(
      'type', 'doc',
      'content', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'type', 'paragraph',
            'attrs', jsonb_build_object('id', gen_random_uuid()::text),
            'content', jsonb_build_array(
              jsonb_build_object('type', 'text', 'text', para)
            )
          )
        ),
        '[]'::jsonb
      )
    )
    FROM unnest(regexp_split_to_array(trim("Story"."body"), E'\n\n+')) AS para
    WHERE para <> ''
  ),
  "wordCount" = COALESCE(
    array_length(
      regexp_split_to_array(trim(regexp_replace("Story"."body", E'\\s+', ' ', 'g')), ' '),
      1
    ),
    0
  );

-- A story whose body was empty/whitespace-only has no paragraphs to unnest,
-- so bodyJson stays NULL above — give it an empty-but-valid doc instead.
UPDATE "Story" SET "bodyJson" = '{"type":"doc","content":[]}'::jsonb WHERE "bodyJson" IS NULL;

ALTER TABLE "Story" DROP COLUMN "body";
ALTER TABLE "Story" RENAME COLUMN "bodyJson" TO "body";
ALTER TABLE "Story" ALTER COLUMN "body" SET NOT NULL;
