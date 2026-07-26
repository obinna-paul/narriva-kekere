-- Removes the paragraph emoji-reaction feature entirely — replaced by the
-- private per-reader highlight feature (see the Highlight table added in
-- the previous migration).
DROP TABLE "ParagraphReaction";
