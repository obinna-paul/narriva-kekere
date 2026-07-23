-- Two-stage review flow: signing the contract now moves a story to ACCEPTED
-- (the "To Be Published" editing queue) rather than straight to PUBLISHED.
ALTER TYPE "StoryStatus" ADD VALUE 'ACCEPTED';
