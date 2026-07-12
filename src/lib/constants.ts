export const SUPPORT_EMAIL = "support@narriva.com";

// The address writers reach the Kekere editorial/submissions team at. Note
// it's narriva.PRO, not .com (SUPPORT_EMAIL above is the separate general
// support inbox). Use this for writer-facing "reply to us" prompts.
export const KEKERE_SUBMISSIONS_EMAIL = "submission@narriva.pro";

// Sender identity for Kekere Stories writer-facing mail (publishing
// agreements, "your story is live"). Kept here so every send uses the same
// name/address instead of drifting (some routes previously fell back to the
// default "Narriva <hello@narriva.pro>" sender).
export const KEKERE_SUBMISSIONS_FROM = `Kekere Stories <${KEKERE_SUBMISSIONS_EMAIL}>`;
