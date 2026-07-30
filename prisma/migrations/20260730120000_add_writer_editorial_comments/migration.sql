-- Lets a writer originate their own editorial comment during review, not
-- just reply to one an editor already left. authorAdminId becomes optional
-- (null for a WRITER-authored comment — the author is always the story's
-- own writer, already known via Story.authorId).
CREATE TYPE "EditorialCommentAuthor" AS ENUM ('EDITOR', 'WRITER');

ALTER TABLE "EditorialComment" ADD COLUMN "authorRole" "EditorialCommentAuthor" NOT NULL DEFAULT 'EDITOR';
ALTER TABLE "EditorialComment" ALTER COLUMN "authorAdminId" DROP NOT NULL;
