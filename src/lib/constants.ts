export const SUPPORT_EMAIL = "support@narriva.pro";

// The address writers reach the Kekere editorial/submissions team at. Note
// it's narriva.PRO, not .com (SUPPORT_EMAIL above is the separate general
// support inbox). Use this for writer-facing "reply to us" prompts.
export const KEKERE_SUBMISSIONS_EMAIL = "submission@narriva.pro";

// Sender identity for Kekere Stories mail that's specifically about a
// submission or a contract — story accepted/rejected/revisions/unpublished,
// contract offer/reminder/signed/declined, "your story is live". Anything
// NOT about a submission or contract (OTP, password reset, referral rewards,
// wallet history, withdrawals) should use KEKERE_GENERAL_FROM instead.
export const KEKERE_SUBMISSIONS_FROM = `Kekere Stories <${KEKERE_SUBMISSIONS_EMAIL}>`;

// Sender identity for general Kekere Stories account mail — OTP/email
// verification, password reset, referral rewards, wallet transaction
// history, withdrawals. Kept here so every send uses the same name/address
// instead of drifting (some routes previously fell back to the app-wide
// default "Narriva <hello@narriva.pro>" sender, or were incorrectly sent
// from KEKERE_SUBMISSIONS_FROM even though they aren't submission/contract
// mail).
export const KEKERE_GENERAL_EMAIL = "hello@narriva.pro";
export const KEKERE_GENERAL_FROM = `Kekere Stories <${KEKERE_GENERAL_EMAIL}>`;

// Personal sender identity for mail from Obinna himself — the welcome email
// and the first-top-up thank-you note. Deliberately not a branded template
// (see the plain-text reasoning at each call site): a designed HTML email
// reads as bulk mail, plain text from a real name reads as the personal
// note it actually is.
export const OBINNA_FROM = "Obinna Ezeodili <obinna@narriva.pro>";
