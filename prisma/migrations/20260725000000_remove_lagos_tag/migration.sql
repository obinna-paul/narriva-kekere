-- Retire the "Lagos" setting tag: removed from the STORY_TAGS catalog, so
-- drop the matching Tag row too (cascades to any StoryTag rows using it).
DELETE FROM "Tag" WHERE "slug" = 'lagos';
