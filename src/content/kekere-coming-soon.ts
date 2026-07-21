// Shared between server (kekere-writer-profile.ts, the profile PATCH route)
// and client (the profile edit form's draft picker) — a plain constant with
// no server-only imports, so it's safe to bundle into client code.
// A draft needs real momentum behind it before it's shareable as "coming
// soon" — enough that a stranger sees genuine progress, not a one-line
// placeholder. ~2 minutes of reading at the app's own 200wpm estimate.
export const MIN_COMING_SOON_WORD_COUNT = 300;
