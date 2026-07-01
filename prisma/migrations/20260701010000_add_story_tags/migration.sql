-- Migration: add Tag and StoryTag models + seed all system tags
-- Tags are admin-assigned at publish time; slugs must match src/content/story-tags.ts

CREATE TABLE "Tag" (
  "id"    TEXT NOT NULL,
  "slug"  TEXT NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");
CREATE INDEX "Tag_slug_idx" ON "Tag"("slug");

CREATE TABLE "StoryTag" (
  "storyId" TEXT NOT NULL,
  "tagId"   TEXT NOT NULL,
  CONSTRAINT "StoryTag_pkey" PRIMARY KEY ("storyId","tagId")
);

CREATE INDEX "StoryTag_storyId_idx" ON "StoryTag"("storyId");
CREATE INDEX "StoryTag_tagId_idx"   ON "StoryTag"("tagId");

ALTER TABLE "StoryTag"
  ADD CONSTRAINT "StoryTag_storyId_fkey"
    FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryTag"
  ADD CONSTRAINT "StoryTag_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: all 57 system-registered tags (must match src/content/story-tags.ts exactly)
INSERT INTO "Tag" ("id","slug","label") VALUES
  (gen_random_uuid(),'funny','Funny'),
  (gen_random_uuid(),'dark','Dark'),
  (gen_random_uuid(),'creepy','Creepy'),
  (gen_random_uuid(),'heartwarming','Heartwarming'),
  (gen_random_uuid(),'tense','Tense'),
  (gen_random_uuid(),'melancholy','Melancholy'),
  (gen_random_uuid(),'rage','Rage'),
  (gen_random_uuid(),'poetic','Poetic'),
  (gen_random_uuid(),'absurdist','Absurdist'),
  (gen_random_uuid(),'romance','Romance'),
  (gen_random_uuid(),'erotic','Erotic'),
  (gen_random_uuid(),'grief','Grief'),
  (gen_random_uuid(),'heartbreak','Heartbreak'),
  (gen_random_uuid(),'revenge','Revenge'),
  (gen_random_uuid(),'survival','Survival'),
  (gen_random_uuid(),'identity','Identity'),
  (gen_random_uuid(),'trauma','Trauma'),
  (gen_random_uuid(),'family','Family'),
  (gen_random_uuid(),'friendship','Friendship'),
  (gen_random_uuid(),'betrayal','Betrayal'),
  (gen_random_uuid(),'ambition','Ambition'),
  (gen_random_uuid(),'power','Power'),
  (gen_random_uuid(),'religion','Religion'),
  (gen_random_uuid(),'money','Money'),
  (gen_random_uuid(),'politics','Politics'),
  (gen_random_uuid(),'justice','Justice'),
  (gen_random_uuid(),'class','Class'),
  (gen_random_uuid(),'race','Race'),
  (gen_random_uuid(),'gender','Gender'),
  (gen_random_uuid(),'parenthood','Parenthood'),
  (gen_random_uuid(),'lagos','Lagos'),
  (gen_random_uuid(),'city','City'),
  (gen_random_uuid(),'village','Village'),
  (gen_random_uuid(),'diaspora','Diaspora'),
  (gen_random_uuid(),'campus','Campus'),
  (gen_random_uuid(),'workplace','Workplace'),
  (gen_random_uuid(),'historical','Historical'),
  (gen_random_uuid(),'thriller','Thriller'),
  (gen_random_uuid(),'mystery','Mystery'),
  (gen_random_uuid(),'psychological','Psychological'),
  (gen_random_uuid(),'speculative','Speculative'),
  (gen_random_uuid(),'literary','Literary'),
  (gen_random_uuid(),'crime','Crime'),
  (gen_random_uuid(),'coming-of-age','Coming-of-Age'),
  (gen_random_uuid(),'satire','Satire'),
  (gen_random_uuid(),'killer','Killer'),
  (gen_random_uuid(),'antihero','Antihero'),
  (gen_random_uuid(),'outsider','Outsider'),
  (gen_random_uuid(),'con-artist','Con Artist'),
  (gen_random_uuid(),'twist-ending','Twist Ending'),
  (gen_random_uuid(),'slow-burn','Slow Burn'),
  (gen_random_uuid(),'quick-read','Quick Read'),
  (gen_random_uuid(),'binge-worthy','Binge-Worthy'),
  (gen_random_uuid(),'thought-provoking','Thought-Provoking'),
  (gen_random_uuid(),'tragic','Tragic'),
  (gen_random_uuid(),'redemption','Redemption');
