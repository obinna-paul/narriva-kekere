# Narriva + Kekere Stories
## Today's Decisions & Specifications

Everything discussed and locked in today's session — the cowrie economy, story publishing model, admin dashboard, and author portal.

---

# Locked Decisions — Kekere Economy & Publishing Model
## Addendum to the Build Plan & Admin Dashboard Spec

---

## What This Document Is

Six of the seven open decisions from the Admin Dashboard Spec are now locked. This document records each decision, corrects everything in earlier documents that those decisions affect, and flags the one remaining open question before any of this gets built.

Read this before touching Phase 0's `decisions.ts`, before Phase 10's Kekere UI, and before Phase 12's moderation queue.

---

## LOCKED DECISION 1: Writer Earnings Split

**70% of each story's cowrie cost goes to the author. 30% is retained by the platform.**

This applies to every paid story unlock. Free stories (0 cowries) generate no earnings.

**How this works at transaction time (must be atomic):**

When a reader unlocks a paid story:
1. Deduct `cowrieCost` cowries from the reader's spending wallet
2. Credit `cowrieCost × 0.70` to the writer's earned wallet (round down to nearest whole cowrie if needed — e.g. a 3-cowrie story: 3 × 0.70 = 2.1 → writer receives 2 cowries, platform retains 1)
3. Credit `cowrieCost × 0.30` to a platform earnings ledger (not a user wallet — a separate accounting record)
4. Create a `StoryUnlock` record
5. Create Transaction records for both the deduction and the credit

All five steps in a single database transaction. If any step fails, all roll back.

**Rounding rule:** Always round the writer's share down to the nearest whole cowrie. The platform keeps the remainder. Document this in code comments wherever the split is calculated. Never round up for the writer (platform eats the rounding risk).

---

## LOCKED DECISION 2: Cowrie Exchange Rate

**1 cowrie = ₦50, universally. This rate applies to both top-ups and withdrawals.**

### Impact: decisions.ts must be completely rewritten

The top-up packages in the earlier `decisions.ts` were wrong — they were based on a ₦5/cowrie rate (₦500 = 100 cowries). Those are now replaced.

**New COWRIE_TOPUP_PACKAGES (replace entirely):**

```typescript
export const COWRIE_RATE_NGN = 50; // 1 cowrie = ₦50, applies everywhere

export const COWRIE_TOPUP_PACKAGES = [
  { priceNGN: 500,  cowries: 10,  bonusCowries: 0  }, // minimum purchase
  { priceNGN: 1000, cowries: 20,  bonusCowries: 2  }, // +2 bonus = 22 total
  { priceNGN: 2500, cowries: 50,  bonusCowries: 5  }, // +5 bonus = 55 total
  { priceNGN: 5000, cowries: 100, bonusCowries: 10 }, // +10 bonus = 110 total
] as const;

export const MINIMUM_PURCHASE_COWRIES = 10;
export const MINIMUM_WITHDRAWAL_COWRIES = 10;
export const COWRIE_WITHDRAWAL_RATE_NGN = 50; // same as purchase rate
```

**Note on bonus cowries:** The bonus structure from the earlier draft is kept here because it incentivises larger purchases. At the ₦50/cowrie base rate, the bonus packages effectively give a small discount (₦45.45/cowrie on larger packages). If you'd rather keep it clean (no bonuses, exact ₦50/cowrie throughout), remove the bonusCowries entries and this remains a locked decision. The build plan will proceed with bonuses included unless you say otherwise.

**New STORY_TIER_RANGES (replace entirely):**

The old ranges (Standard 10-30, Featured 40-60, Premium 70-100) were based on the wrong rate and are completely replaced. Stories now cost 0-6 cowries:

```typescript
export const STORY_COWRIE_RANGE = {
  free: 0,
  min_paid: 2,
  max_paid: 6,
} as const;
```

The STANDARD / FEATURED / PREMIUM tier enum is kept in the database but is now an **editorial classification** (controls how prominently a story is featured in the feed — which row it appears in, whether it gets a "Featured" badge) and is **decoupled from price**. Price is set independently by admin when approving a story.

### Impact: story unlock costs

At ₦50/cowrie:
- Cheapest paid story (2 cowries) = ₦100
- Most expensive story (6 cowries) = ₦300
- Minimum top-up (10 cowries / ₦500) covers 1-5 stories

This is genuinely affordable for a Nigerian reader. Good pricing.

### Impact: writer earnings at ₦50/cowrie

| Story cost | Writer receives (70%) | Platform retains (30%) |
|---|---|---|
| Free | 0 cowries | 0 |
| 2 cowries | 1 cowrie (₦50) | 1 cowrie |
| 3 cowries | 2 cowries (₦100) | 1 cowrie |
| 4 cowries | 2 cowries (₦100) | 2 cowries |
| 5 cowries | 3 cowries (₦150) | 2 cowries |
| 6 cowries | 4 cowries (₦200) | 2 cowries |

A popular story unlocked 500 times at 4 cowries: writer earns 1,000 cowries = **₦50,000**. That's meaningful money for a short story — a strong incentive for writers.

### Impact: withdrawal

Minimum withdrawal = 10 cowries = ₦500. Writer submits bank details, admin approves, platform transfers ₦50 × (cowries withdrawn) to the writer's bank account.

---

## LOCKED DECISION 3: Cowrie Earning Mechanisms (NEW — Not Previously Specced)

Three new ways users can earn cowries beyond buying them:

### 3A: Story Completion Bonus (Readers)

When a reader finishes a paid story they've unlocked (defined as: reaching the end of the story, tracked by scroll position reaching 95%+ of content), they automatically receive **1 bonus cowrie** credited to their spending wallet.

This goes into the **spending wallet** (not the earned wallet — it's a platform reward, not a writer payout).

New Transaction type needed: `COMPLETION_BONUS`

Technical note: the completion event must be debounced and verified server-side — a reader shouldn't be able to claim the bonus by manipulating scroll position client-side. Server-side: when the client fires a "story completed" event, verify the reader has a valid unlock for this story and has not already claimed a completion bonus for it (check a `completedStories` record). If valid, credit 1 cowrie. This bonus can only be claimed once per story per reader.

New model needed: `StoryCompletion` { id, userId, storyId, completedAt, bonusCredited: Boolean }

### 3B: Tips (Readers → Writers)

After a reader reaches the end of a story (completion screen), they see a "Tip the writer" button. Tipping sends exactly **1 cowrie** from the reader's spending wallet to the writer's earned wallet.

Rules:
- Tip amount is fixed at 1 cowrie. No choice, no customization.
- A reader can only tip the same story once.
- The platform takes **no cut** of tips — the full 1 cowrie goes to the writer.
- Reader must have at least 1 cowrie in their spending wallet to tip. If they don't, show a "Top up to tip" prompt.

New Transaction types needed: `TIP_SENT` (reader's wallet) and `TIP_RECEIVED` (writer's wallet)

New model: `Tip` { id, readerId, writerId, storyId, tippedAt } with @@unique([readerId, storyId])

UI: the completion screen (from Phase 10/11 spec) now shows:
1. "You finished [Title]." 
2. Star rating (optional)
3. "Tip the writer 1 cowrie 🐚" button (if reader has balance)
4. Share button
5. Back to feed

### 3C: Referral Program (Readers invite Readers)

Every registered Kekere user gets a unique referral code (generated at signup). When a new user signs up using a referrer's code, and then **unlocks their first paid story**, the referrer earns cowries.

**Referral reward:** 3 cowries (₦150 value) per successful referral.

Referral triggers when:
1. New user signs up with a referral code → link the referral
2. New user unlocks their FIRST paid story → trigger reward
3. Credit referrer's spending wallet with the reward cowries
4. Create Transaction type `REFERRAL_REWARD`
5. Notify referrer: "Someone you invited just read their first story — you've earned X cowries!"

New models needed:
```
ReferralCode { id, userId @unique, code String @unique, createdAt }
Referral { id, referrerId, referredUserId @unique, codeUsed, status enum [PENDING, REWARDED], rewardedAt?, createdAt }
```

The referral code lives at `/invite/[code]` — visiting this URL before sign-up sets a cookie, and the cookie is read during registration to link the referral.

### Sharing Features

Both the referral program and organic story sharing require sharing infrastructure:

**Story share links:** `/story/[id]?ref=[userId]` — every share link includes the sharer's user ID as a referral parameter. If a new user clicks this link, signs up, and unlocks their first story, the sharer is rewarded as above. This doubles as viral sharing.

**Share targets on the completion screen:**
- Copy link (with ref code embedded)
- WhatsApp (primary for Nigerian audience — deep link to WhatsApp with pre-written message)
- Twitter/X
- Instagram Stories (generates a story card image — a "Now Reading" card with the story's cover, title, and a QR code to the story)

**Instagram Stories card generation** is a nice-to-have — flag it. Core requirement is copy link and WhatsApp.

**Referral dashboard for users (in /wallet or /profile):**
- "Your referral code: [CODE]"
- Copy button + share button
- "X friends invited · X cowries earned"
- List of referrals: username (partial), status (Joined / Read first story), reward (Pending / Earned)

---

## LOCKED DECISION 4: Writer Withdrawal — Bank Details Only, No ID

Writers submit bank details to withdraw. No ID verification required.

Bank details collected at withdrawal request time (if not already on file):
- Bank name (dropdown of Nigerian banks)
- Account number (10-digit NUBAN)
- Account name (as it appears on the bank account)

**Important:** Paystack's Transfers API can be used to automate payouts — it accepts a NUBAN account number and bank code, and initiates a bank transfer directly. This removes the need for manual bank transfers. Strongly recommend integrating Paystack Transfers in the withdrawal flow.

Add to the bank details model:
```
WriterBankDetails { 
  id, userId @unique, 
  bankName, bankCode (for Paystack), 
  accountNumber, accountName, 
  verifiedAt (optional — Paystack can verify account names), 
  createdAt, updatedAt 
}
```

Paystack has a "Resolve Account Number" API that can verify a NUBAN and return the account holder's name before saving — this is a lightweight verification with no KYC friction. Use it.

---

## LOCKED DECISION 5: Story Publishing Model — Admin Controls Everything

This is a **significant change** from the earlier spec. What the writer does and what admin does are now clearly separated:

**What writers do:**
- Write and submit for review
- That's it. They don't set the price. They don't set the tier. They don't decide if it's paid or free.

**What admin does:**
- Review the submission
- Decide: publish or not
- If publishing: decide paid (2-6 cowries, admin sets the exact number) or free (0 cowries)
- Decide the editorial tier (Standard / Featured / Premium) for placement in the feed
- Writer is notified of the decision and the price set

### Impact: Writer Editor UI (Phase 10 — must be changed)

**Remove from the writer's editor:**
- ~~Tier selection (Standard / Featured / Premium)~~
- ~~Cowrie cost input~~
- ~~Any reference to pricing their story~~

**The writer's editor now only has:**
- Title field
- Hook line field (one sharp sentence)
- Body / chapter content
- Word count + estimated reading time (auto-calculated)
- Status badge (Draft / Submitted / Published / Rejected / Revisions Requested)
- Autosave
- Submit for review button

No pricing decisions, no tier selection. The submission is purely about the writing.

The submission confirmation modal copy also changes slightly:
*"Submitting means your story goes to our editorial team. If we want to publish it, we'll come back to you with our decision and the details — usually within 5-7 business days."*

### Impact: Admin Review Queue (Phase 12 / Admin Dashboard D1 — must be changed)

The PUBLISH action in the review queue now includes price-setting:

When admin clicks PUBLISH:
1. Paid or free? (toggle)
2. If paid: cowrie cost (number input, 2-6, validated within range)
3. Editorial tier: Standard / Featured / Premium (controls feed placement)
4. Optional note to writer (e.g. "We loved this — we're publishing it at 4 cowries")
5. Confirm

The cowrie cost and tier are set here by admin, not from the writer's submission.

### Story cost range note

Stories cost 2-6 cowries. The Kekere top-up minimum is 10 cowries. This means a reader's first purchase always covers at least 1-5 stories. That's good economics — readers don't run out of cowries after one story.

---

## LOCKED DECISION 6: Google Analytics 4

Use GA4 for analytics. The Admin Dashboard Module B (Traffic & Growth) integrates via the GA4 Data API (also known as the Google Analytics Data API v1beta/v1).

Implementation note for the developer: GA4 requires:
- Setting up a GA4 property and connecting it to both narriva.com and kekere.narriva.com (two data streams under one property)
- Generating a service account key with "Viewer" access to the GA4 property
- Adding `GOOGLE_ANALYTICS_PROPERTY_ID` and `GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY` to `.env.example`
- Using the `@google-analytics/data` Node.js SDK in the backend

The dashboard admin API routes will call GA4 on the server side — never expose the service account credentials to the client. All analytics data flows through `/api/admin/analytics/*` endpoints that check for ADMIN role before calling GA4.

---

## LOCKED DECISION 7: Nari Privacy Disclosure

The disclosure will be added to the Privacy Policy in Phase 16 when that page is built. No action needed before then. Flagged for Claude Code at Phase 16 prompt time.

---

## REMAINING OPEN QUESTION

None. All decisions are now locked.

---

## COMPLETE UPDATED DECISIONS.TS

Below is the full updated `src/content/decisions.ts` file that replaces the version from Phase 0. Pass this to Claude Code at the start of Phase 1 (database) with the instruction: "Replace the existing decisions.ts with this version before proceeding."

```typescript
// src/content/decisions.ts
// Single source of truth for all locked business decisions.
// Phases import from here. Never hardcode these values elsewhere.

export const COMPANY_NAME = "Narriva" as const;

export const DOMAINS = {
  narriva: "narriva.com",
  kekere: "kekere.narriva.com",
} as const;

// ─── COWRIE ECONOMY ────────────────────────────────────────────────────────

/** Universal rate: 1 cowrie = ₦50. Applies to top-ups AND withdrawals. */
export const COWRIE_RATE_NGN = 50;

/** Minimum cowries that can be purchased in one transaction. */
export const MINIMUM_PURCHASE_COWRIES = 10;

/** Minimum cowries required to request a withdrawal. */
export const MINIMUM_WITHDRAWAL_COWRIES = 10;

/** Top-up packages available to readers. */
export const COWRIE_TOPUP_PACKAGES = [
  { priceNGN: 500,  cowries: 10,  bonusCowries: 0  },
  { priceNGN: 1000, cowries: 20,  bonusCowries: 2  },
  { priceNGN: 2500, cowries: 50,  bonusCowries: 5  },
  { priceNGN: 5000, cowries: 100, bonusCowries: 10 },
] as const;

/**
 * Writer earnings split on each paid story unlock.
 * 70% goes to the story's author. 30% is retained by the platform.
 * Always round the writer's share DOWN to the nearest whole cowrie.
 */
export const WRITER_EARNINGS_RATE = 0.70;
export const PLATFORM_EARNINGS_RATE = 0.30;

/**
 * Story cowrie cost range. Admin sets the exact cost within this range
 * when approving a story for publication. Writers do not set prices.
 */
export const STORY_COWRIE_RANGE = {
  free: 0,
  min_paid: 2,
  max_paid: 6,
} as const;

/** Cowries awarded to a reader for finishing a paid story they unlocked. */
export const COMPLETION_BONUS_COWRIES = 1;

/**
 * Cowries awarded to the reader who tips a writer.
 * Tips cost the reader exactly 1 cowrie. Platform takes no cut.
 * The full 1 cowrie goes to the writer.
 */
export const TIP_AMOUNT_COWRIES = 1;

/**
 * Cowries awarded to a referrer when someone they invited unlocks
 * their first paid story.
 */
export const REFERRAL_REWARD_COWRIES = 3;

// ─── STORY SETTINGS ────────────────────────────────────────────────────────

/**
 * Average words per minute used to calculate reading time estimates.
 * Applied in the writer editor and on story cards.
 */
export const READING_WPM = 238;

/**
 * Scroll depth (as a decimal) at which a story is considered "completed"
 * for the purposes of completion bonus and tip eligibility.
 */
export const COMPLETION_SCROLL_THRESHOLD = 0.95;

// ─── SHIPPING (no longer used — Narriva is ebook-only) ─────────────────────
// Physical shipping was removed in Phase 15. These constants are intentionally
// absent. If physical books are ever added back, add SHIPPING_RATES here.

// ─── DOMAINS ───────────────────────────────────────────────────────────────
export const SUPPORT_EMAIL = "support@narriva.com";
```

---

## DATABASE SCHEMA ADDITIONS (Pass to Phase 1 or as a migration before Phase 11)

Add these models to the Prisma schema:

```prisma
// Two separate wallet buckets per user
// Replace the single Wallet model with this:
model Wallet {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  
  // Spending balance: cowries bought via top-up + completion bonuses + referral rewards
  spendingBalance Int      @default(0)
  
  // Earned balance: cowries earned from story unlocks (writers only) + tips received
  // Writers withdraw FROM this balance. Readers don't have an earned balance.
  earnedBalance   Int      @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  transactions    Transaction[]
}

// Extend Transaction type enum to include new types:
// TOP_UP, UNLOCK, REFUND, WITHDRAWAL, COMPLETION_BONUS, TIP_SENT,
// TIP_RECEIVED, REFERRAL_REWARD, EARNINGS_CREDIT, PLATFORM_EARNINGS
// (PLATFORM_EARNINGS is for the 30% platform cut — tracked for accounting)

model Tip {
  id        String   @id @default(cuid())
  readerId  String
  reader    User     @relation("TipsSent", fields: [readerId], references: [id])
  writerId  String
  writer    User     @relation("TipsReceived", fields: [writerId], references: [id])
  storyId   String
  story     Story    @relation(fields: [storyId], references: [id])
  tippedAt  DateTime @default(now())

  @@unique([readerId, storyId]) // one tip per reader per story
}

model StoryCompletion {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  storyId        String
  story          Story    @relation(fields: [storyId], references: [id])
  completedAt    DateTime @default(now())
  bonusCredited  Boolean  @default(false)

  @@unique([userId, storyId]) // one completion record per reader per story
}

model ReferralCode {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  code      String   @unique
  createdAt DateTime @default(now())
}

model Referral {
  id             String         @id @default(cuid())
  referrerId     String
  referrer       User           @relation("ReferralsSent", fields: [referrerId], references: [id])
  referredUserId String         @unique // a user can only be referred once
  referredUser   User           @relation("ReferralReceived", fields: [referredUserId], references: [id])
  codeUsed       String
  status         ReferralStatus @default(PENDING)
  rewardedAt     DateTime?
  createdAt      DateTime       @default(now())
}

enum ReferralStatus {
  PENDING   // referred user signed up but hasn't unlocked first story yet
  REWARDED  // first unlock happened, referrer credited
}

model WriterBankDetails {
  id            String    @id @default(cuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id])
  bankName      String
  bankCode      String    // Paystack bank code for Transfers API
  accountNumber String    // 10-digit NUBAN
  accountName   String    // as returned by Paystack account resolution
  verifiedAt    DateTime? // timestamp of Paystack account name verification
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model WithdrawalRequest {
  id              String            @id @default(cuid())
  userId          String
  user            User              @relation(fields: [userId], references: [id])
  cowriesAmount   Int
  ngnAmount       Float             // cowriesAmount × COWRIE_RATE_NGN
  bankDetailsId   String
  bankDetails     WriterBankDetails @relation(fields: [bankDetailsId], references: [id])
  status          WithdrawalStatus  @default(PENDING)
  paystackTransferCode String?      // returned by Paystack Transfers API on initiation
  adminNote       String?
  requestedAt     DateTime          @default(now())
  processedAt     DateTime?
}

enum WithdrawalStatus {
  PENDING
  APPROVED
  PROCESSING  // transfer initiated with Paystack
  COMPLETED   // transfer confirmed
  REJECTED
  FAILED      // Paystack transfer failed
}

// Platform earnings ledger (the 30% cut)
model PlatformEarnings {
  id          String   @id @default(cuid())
  storyId     String
  story       Story    @relation(fields: [storyId], references: [id])
  unlockId    String   @unique
  cowries     Int      // the platform's 30% cut (whole cowries)
  createdAt   DateTime @default(now())
}
```

---

## SUMMARY: WHAT CHANGED IN EARLIER DOCUMENTS

| Document / Phase | What to change |
|---|---|
| `decisions.ts` (Phase 0) | Replace entirely with the updated version above |
| Phase 1 (Prisma schema) | Add all new models above before or during migration |
| Phase 10 (Kekere UI — Writer Editor) | Remove tier selector and price input from the editor |
| Phase 10 (Kekere UI — Wallet) | Show two balances: Spending and Earned. Referral code display. Top-up packages use new numbers. |
| Phase 10 (Kekere UI — Story completion screen) | Add tip button + share options (copy link, WhatsApp) |
| Phase 11 (Kekere backend — unlock) | Split earnings atomically: 70% to writer earned wallet, 30% to platform ledger |
| Phase 11 (Kekere backend — new routes) | Add: completion event, tip, referral link tracking |
| Phase 12 (Moderation queue) | Admin sets paid/free + cowrie cost (2-6) + tier when approving. No writer-set price. |
| Phase 14 (Payments) | Top-up packages use new NGN amounts and cowrie totals |
| Phase 15 (Ebook / was fulfillment) | No change |
| Admin Dashboard D1 (Review queue) | Admin price-setting UI on the PUBLISH action |
| Admin Dashboard D6 (Cowrie economy) | Two-bucket accounting (spending vs earned) |
| Admin Dashboard D7 (Withdrawals) | Bank details form, Paystack Transfers integration |

---

---

# Narriva + Kekere Stories
## Admin Dashboard & Author Portal — Full Specification

---

## Overview: Three Surfaces, One Login

This specification covers three distinct products sharing a single authentication system:

**1. The Author Portal** — what Narriva's publishing clients see. Warm, client-facing, project-management-style. Authors track their book's progress, download assets, leave feedback, and approve deliverables. They never see admin data, analytics, or other authors' work.

**2. The Admin Dashboard** — what the Narriva/Kekere internal team sees. Powerful, information-dense, covers both platforms from one place. Everything from traffic analytics to story moderation to Nari intelligence lives here.

**3. Kekere Writer Additions** — new features added to the existing Kekere writer experience (contracts inbox, withdrawal request flow). Not a separate surface — these extend what writers already access through `/profile` and `/wallet`.

All three share the same user database and login system. Role determines what you see after logging in.

---

## Decisions Required Before Building

These were not defined in earlier phases. Lock them before development starts — they affect data models, payment flows, and legal copy.

| Decision | Why it matters |
|---|---|
| Writer earnings model | What % of each story unlock does the author receive as cowries? (e.g. 60% of cowrie cost → author, 40% platform) |
| Cowrie withdrawal rate | What is 1 cowrie worth in NGN at withdrawal time? Is it the same as the top-up rate, or does the platform take a cut? |
| Minimum withdrawal threshold | What is the minimum cowrie balance required before a writer can request withdrawal? |
| Writer KYC requirements | Do writers need to submit bank account details and/or ID before they can withdraw? |
| What triggers a Kekere publishing contract? | Every published story? Competition winners only? Exclusive arrangements only? |
| Analytics data source | Google Analytics 4 API, Plausible API, or custom event tracking? Affects the entire analytics module design. |
| Nari privacy disclosure | Conversations with Nari that are analysed for lead intelligence must be disclosed in the Privacy Policy (Phase 16). Confirm the disclosure language before building the intelligence feed. |

---

---

# PART ONE: THE AUTHOR PORTAL (Narriva Clients)

---

## Who Uses This

Authors who have submitted a manuscript to Narriva and are in an active relationship with the publishing team — either post-submission (tracking review status) or post-acceptance (tracking their book's development through to launch). They log in with the same account they'd use anywhere else on narriva.com.

## The Principle

This should feel like a premium client portal, not a generic project management tool. The author is trusting Narriva with something they've spent months or years writing. This interface should reflect the same care and quality that Narriva's publishing work does. Warm, clear, unhurried. Not a corporate extranet.

---

## Module 1: Project Overview

The landing page for an author who has an active project.

**What they see:**

A header area showing:
- Book title (large, Fraunces)
- Current stage as a prominent status badge: `EDITORIAL` / `DESIGN` / `PRODUCTION` / `LAUNCH`
- A one-line status note from the team, editable by admin — e.g. *"Your manuscript is currently with the developmental editor. We'll have notes back to you by 12 August."*
- Cover image thumbnail once design has started, placeholder before that

Below the header, three summary cards:
- **Submitted:** date
- **Est. publication:** date (admin-entered, or "TBD" until confirmed)
- **Your action needed:** count of deliverables awaiting author review/approval

If the count of pending author actions is greater than zero, the page opens with a gentle banner: *"You have [X] item(s) waiting for your review."* with a direct link to the deliverables section.

---

## Module 2: Progress Timeline

A visual stepper running horizontally on desktop, vertically on mobile.

**Five stages:**

```
Assessment → Editorial → Design → Production → Launch
```

Each stage node shows:
- Status icon: ○ Upcoming / ◉ In Progress / ✓ Complete
- Stage name
- Admin-entered description of what's happening in this stage (e.g. "Structural and line editing of your manuscript")
- Estimated timeframe (e.g. "3-4 weeks")
- Actual completion date once marked complete

The in-progress stage is visually prominent — larger node, name in bold, animated pulse on the indicator if desired.

Admin controls (not visible to author):
- Advance to next stage (prompts admin to confirm + add a note to the communication log)
- Edit the description and timeframe for any stage
- Add a custom sub-stage if needed (e.g. "Cover concepts — Round 1")

---

## Module 3: Deliverables & Asset Review

This is the operational core of the Author Portal. Every file Narriva produces for an author lives here, and the author's approval workflow happens here.

### The Deliverables List

Each deliverable is a card in a list, grouped by stage:

```
EDITORIAL
  ─ Chapter 1–5 Developmental Edit (v1)     [FOR REVIEW]
  ─ Full Manuscript Line Edit (v2)           [APPROVED ✓]

DESIGN
  ─ Cover Concept — Direction A             [FOR REVIEW]
  ─ Cover Concept — Direction B             [FOR REVIEW]
  ─ Interior Layout Sample (pages 1–20)     [DRAFT]
```

Each card shows:
- File name and type icon
- Version number
- Uploaded by (team member name)
- Date uploaded
- Status badge: `DRAFT` / `FOR REVIEW` / `CHANGES REQUESTED` / `APPROVED`
- Download button (always available regardless of status)
- "Review" button (available when status is FOR REVIEW)

### The Review Panel

When an author clicks "Review" on a deliverable, a panel opens — slides in from the right on desktop, takes over the screen on mobile.

**Top:** File preview
- PDF files: inline viewer (first few pages rendered, scrollable)
- Images (cover designs): full-width display with zoom
- DOCX files: a note that they should download to view changes properly, with a prominent download button
- EPUB files: download only

**Middle:** Comment thread specific to this deliverable
- Previous comments from both author and team
- New comment text field with submit button
- Comments are timestamped and attributed by name + role

**Bottom:** Decision buttons
- `Approve this version` (green) — marks deliverable as APPROVED, logs timestamp and author name, notifies admin
- `Request changes` (orange) — opens a required feedback textarea before confirming. Submitting sets status to CHANGES_REQUESTED and creates a task in admin's queue. Admin is notified immediately.

**Once approved:** the deliverable card is locked. A green "Approved [date]" badge replaces the action buttons. The author can still comment and download, but cannot un-approve (only admin can reset this if needed).

### Version History

Every deliverable can have multiple versions. When admin uploads a new version (after addressing change requests), it appears as v2, v3, etc. on the same card — older versions are accessible in a "Version history" dropdown but not the active version. The author reviews and approves the latest version.

### Supported File Types

| Type | Preview | Download |
|---|---|---|
| PDF (manuscripts, proofs, final files) | ✓ Inline | ✓ |
| DOCX (tracked-changes edits) | Note to download | ✓ |
| JPG/PNG (cover designs, illustrations) | ✓ Inline | ✓ |
| EPUB (final ebook) | ✗ | ✓ |
| AI/PSD (design source files) | ✗ | ✓ |

---

## Module 4: Communication Log

A clean, chronological thread between the author and the Narriva team.

**Each message shows:**
- Sender name
- Sender role (Author / Editorial Lead / Cover Designer / Project Manager)
- Timestamp
- Message body (supports basic formatting: bold, italic, line breaks)

**Author can:** post a new message at any time. Reply to specific messages (threaded, optional — simpler to make it one thread per project).

**Admin can:**
- Post a message visible to the author (appears in the thread)
- Post an **internal note** (not visible to the author — shown with a distinct grey/yellow background in admin view, completely hidden in author view) for team coordination

**Admin pins:** admin can pin any message as a "Key decision" — these appear in a separate "Decisions log" at the top of the communication tab. Useful for tracking approvals, key choices (e.g. "Author approved Direction B cover — 14 July 2026").

---

## Module 5: Documents & Contracts

A simple document library for this author's legal and administrative documents.

- Publishing Agreement (once signed — PDF, download only)
- ISBN certificate (once assigned)
- Copyright registration documentation
- Any other administrative documents

Admin uploads these; author can download but not upload back (this isn't a two-way file exchange — it's admin → author document delivery).

---

## Module 6: Book Info (Post-Publication)

Becomes visible once the book has launched.

- Published cover (full size)
- Book title, ISBN
- Publication date
- Link to the book's page on the Narriva bookstore
- Sales data (admin-controlled how much to show — minimum: total copies sold and total author earnings due, if a royalty model is in place)

---

## Navigation & Access

**Author portal URL:** `/portal` or `/dashboard` — already defined in Phase 8.

**If an author has multiple books:** the portal home shows a list of their projects. Clicking one enters that project's detail view. Each project is fully separate.

**If an author has submitted but not yet been accepted:** they see only Module 1 (Project Overview showing submission received + status) and Module 2 (timeline showing "Assessment" as the current stage). Modules 3-6 are not visible until a project is formally created by admin.

---

---

# PART TWO: THE ADMIN DASHBOARD

---

## Architecture

A single-page application at `/admin` with a persistent left sidebar navigation. The sidebar groups modules by area:

```
OVERVIEW
  ○ Command Center

ANALYTICS
  ○ Traffic & Acquisition
  ○ User Growth
  ○ Conversion Funnels

NARRIVA
  ○ Book Sales
  ○ Submissions
  ○ Author Projects
  ○ Nari Intelligence

KEKERE
  ○ Story Review Queue
  ○ Published Library
  ○ Performance
  ○ Competitions
  ○ Publishing Contracts
  ○ Cowrie Economy
  ○ Withdrawal Requests
  ○ User Analytics

PLATFORM
  ○ All Users
  ○ Settings & Config
```

Permission levels control which sections are visible per admin role.

---

## MODULE A: Command Center (Home)

The first thing every admin sees on login. Gives a complete picture of the business in a single scroll.

### Row 1: KPI Cards

Six cards across the top, each showing a live number and a WoW (week-over-week) percentage change with a trend arrow:

| Card | Metric | Scope |
|---|---|---|
| Total Revenue | NGN earned | Narriva ebook sales + Kekere top-ups, this month |
| New Users | Registrations | Both platforms, last 7 days |
| Active Kekere Users | Logged in + read/wrote | Last 7 days |
| New Submissions | Manuscript submissions | This week |
| Cowries in Circulation | Total wallet balances | Live |
| Pending Actions | Items requiring admin attention | Live count |

The Pending Actions card is clickable and expands to show the breakdown: X stories awaiting review, X withdrawal requests pending, X author change requests, X unsigned contracts.

### Row 2: Revenue & Growth Charts

Two charts side by side (stacked on mobile):

- **Revenue (30-day line chart):** Toggle between Narriva / Kekere / Combined. Shows daily NGN revenue.
- **User Growth (30-day bar chart):** New registrations per day.

### Row 3: Activity Feed + Pending Queue

**Activity Feed (left, 60% width):**
A real-time feed of events across the whole platform, most recent first. Each item has an icon, a description, and a timestamp:
- 📗 New manuscript submitted — *John Adeyemi submitted "The Weight of Lagos"*
- 🔓 Story unlocked — *15 unlocks on "The Mechanic" in the last hour*
- 💰 Top-up completed — *₦5,000 top-up by @user_xxxx*
- 📝 Story submitted for review — *"First Rain" by @chinwe.writes*
- ✅ Deliverable approved — *Cover Direction A approved by Fatima Okafor*
- ⚠️ Withdrawal request — *@emeka.stories requested withdrawal of 1,200 cowries*

**Pending Queue (right, 40% width):**
Everything requiring admin action today, grouped by type:
- Stories awaiting review (X)
- Withdrawal requests pending approval (X)
- Author change requests (X)
- Contracts sent but unsigned for 7+ days (X)
- Nari conversations flagged as HIGH INTENT (X)

Each item is clickable and routes directly to the relevant module.

---

## MODULE B: Traffic & Growth Analytics

**Data source note:** This module requires either the Google Analytics 4 API or the Plausible Analytics API to be integrated. The module is designed around the data available from either. Choose one at the start of this phase and build the integration accordingly. Plausible is simpler and privacy-friendly; GA4 is more powerful but heavier to integrate.

### B1: Traffic Overview

Global date range picker at the top of the analytics section (affects all B modules).

Metrics grid:
- Total Sessions
- Total Users
- Pageviews
- Avg. Session Duration
- Bounce Rate
- Pages per Session

Each with: current period value, previous period value, % change, sparkline chart.

Platform toggle: narriva.com / kekere.narriva.com / Combined

Sessions over time: line chart for the selected date range.

---

### B2: Traffic Acquisition (Where People Come From)

**Channels breakdown table:**

| Channel | Sessions | % of Total | Users | Conversions | Conv. Rate |
|---|---|---|---|---|---|
| Organic Search | | | | | |
| Direct | | | | | |
| Social | | | | | |
| Referral | | | | | |
| Email | | | | | |

(Conversion = signup for Kekere, or submission form start for Narriva)

**Top referral domains:** table of external sites sending traffic, with sessions and conversion rate per domain.

**Top landing pages:** which pages people first arrive on, with sessions, bounce rate, and conversion rate.

**Social breakdown:** if social traffic is significant, break it down by platform (Twitter/X, Instagram, LinkedIn, WhatsApp — especially relevant for Nigerian audience).

**Search Console integration (if GA4):** top organic search queries, average position, impressions, clicks, CTR.

---

### B3: Geographic Breakdown

**Map view:** choropleth world map showing session density by country. Warm colour scale — darker = more sessions.

**Country table:**
- Columns: Country, Sessions, % of total, Users, Avg. Duration
- Default sorted by sessions descending
- Toggle to show only Africa, only Nigeria (city-level)

**Device breakdown:**
- Mobile / Tablet / Desktop — pie chart + table
- Operating system breakdown (Android vs iOS for mobile especially — critical for knowing what devices real Kekere users are on)
- Browser breakdown

---

### B4: User Growth & Retention

**Growth chart:** cumulative total users over time, overlaid with new users per day.

**Activation rate:** % of users who, within 7 days of signing up:
- (Kekere) Read at least one story
- (Narriva) Viewed at least one book or service page for 60+ seconds

**Retention cohort table:**
Rows = signup week. Columns = week 1, 2, 4, 8 retention.
Each cell = % of that cohort still active at that time.
Color-coded: green = strong retention, red = drop-off.

**Inactivity signals:** users who haven't logged in for 30 days — total count and trend. These are candidates for re-engagement email (a future feature, noted here as a data point).

---

### B5: Conversion Funnels

**Narriva funnel** (tracks the path to a manuscript submission):
1. Visits narriva.com → 100% baseline
2. Views a service page or /how-it-works → X%
3. Visits /submit → X%
4. Starts filling the submission form → X%
5. Completes submission → X%

Drop-off percentage between each step. Biggest drop-off = biggest opportunity to improve.

**Kekere funnel** (tracks path to first cowrie spend):
1. Visits kekere.narriva.com → 100% baseline
2. Views the landing page (scrolls past fold) → X%
3. Clicks "Start Reading" → X%
4. Completes sign-up → X%
5. Reads first story → X%
6. Unlocks first paid story → X%
7. Completes first top-up → X%

---

### B6: Growth Summary

A single-page summary view for sharing with stakeholders:

- MoM growth % across all key metrics (users, revenue, submissions, story reads)
- Best and worst performing channels this month
- Top performing content (blog posts driving most organic traffic to Narriva; stories driving most unlocks on Kekere)
- Highlight card: "This month's best acquisition day" — the single highest new-user day and what drove it
- Revenue milestone tracker: a simple progress bar toward a monthly revenue target (admin-configurable)
---

## MODULE C: Narriva — Business Operations

---

### C1: Book Sales Dashboard

The financial picture for Narriva's ebook business.

**Top metrics (same KPI card pattern as Command Center):**
- Total revenue (NGN) — all time / this month / this week (toggleable)
- Total units sold — same breakdowns
- Average revenue per sale
- Best-selling book this month

**Revenue chart:** 30/90/365-day line chart. Toggle: All books / Individual book selector.

**Sales by book table:**

| Title | Author | Units Sold | Revenue (NGN) | Avg/Day | First Sale | Last Sale |
|---|---|---|---|---|---|---|

Sortable by any column. Clicking a row opens a book sales detail view showing:
- Sales over time for that specific book (chart)
- Conversion rate: how many people viewed the book page vs. purchased
- Top referral sources for this book specifically
- Geographic breakdown of buyers

**New release tracker:**
When a new book launches, it appears here automatically. Shows its sales trajectory for the first 7 and 30 days, compared to previous launches if data exists. Makes it easy to see if a launch is performing above or below expectations.

**Refund/revocation log:**
All admin-revoked book purchases (from Phase 15's `/admin/purchases` "Revoke access" feature) listed with reason and admin note. Not expected to be large — this is a goodwill exception tracker.

---

### C2: Manuscript Submissions

The intake queue for Narriva's publishing business.

**Queue view:**
All submissions, default sorted by oldest first within each status group.

Filter options:
- Status: All / Received / Reading / Reviewed / Accepted / Declined
- Date range
- Assigned to (team member)
- Genre

**Each row shows:**
- Author name + email
- Manuscript title
- Genre
- Current stage of manuscript (from the form: Early draft / First complete draft / Revised / Near publication-ready)
- Services requested (tags: Editing / Design / Full service / etc.)
- Submitted date
- Days in current status (highlighted red if >14 days without status change — means something's being neglected)
- Assigned reviewer (if assigned)

**Detail view (clicking a submission):**

Left panel (70%):
- Full submission form data
- Manuscript download button
- Submission history log (timestamped status changes + notes)

Right panel (30%):
- Status controls:
  - **Received → Reading:** marks as being actively read, auto-timestamps
  - **Reading → Reviewed:** prompts admin to write reviewer notes before confirming
  - **Reviewed → Accepted:** creates the Author Portal project, prompts admin to set initial timeline and send welcome communication
  - **Reviewed → Declined:** prompts admin to write decline notes (shown to author) + optional private internal notes
- Assign to: dropdown of admin team members
- "Contact author" button: opens a composer that sends an email via Resend

When a submission is marked Accepted:
1. System creates an `AuthorProject` record linked to this submission and this user
2. Author Portal becomes accessible to this author with stage = Assessment
3. A welcome email is sent automatically (template from Phase 17)
4. Admin is prompted to schedule a kickoff call

---

### C3: Author Project Management

A project management view over all active author projects — the admin side of what authors see in their portal.

**Projects table:**

| Author | Book Title | Stage | Days in Stage | Last Activity | Pending Author Actions | Assigned PM |
|---|---|---|---|---|---|---|

Colour signals:
- Green row: no issues, author has reviewed latest deliverables
- Yellow row: deliverable sent but author hasn't opened it in 7+ days
- Orange row: author has requested changes and admin hasn't responded in 3+ days
- Red row: project has been in the same stage for 30+ days with no movement

Filter: by stage, by assigned PM, by pending action type, by flag colour.

**Project detail view (admin side):**

This mirrors the Author Portal exactly — admin sees everything the author sees — PLUS:

**Admin-only panel (right sidebar):**

Stage controls:
- "Advance to next stage" button — prompts for a note to the communication log, then moves the project forward and notifies the author
- "Add custom milestone" — for books that need sub-stages

Deliverable upload:
- File upload field
- Description field (author-facing label — what this file is)
- Version selector (new upload or new version of existing)
- Status setter: upload as DRAFT (not yet sent to author), or FOR REVIEW (author notified immediately)

Communication:
- Post to communication log: text field with toggle "Visible to author / Internal only"
- Pin a message as "Key decision"

Task assignment:
- Assign a task to a team member related to this project (e.g. "Incorporate author's cover feedback" → assigned to designer with due date)

**Cross-project task view (admin only):**
A separate page `/admin/tasks` showing all open tasks across all author projects, assigned by team member, with due dates. Like a lightweight Asana for the internal team — focused only on author project tasks, not general admin tasks.

---

### C4: Nari Intelligence Feed

Nari is Narriva's AI FAQ chatbot (built in Phase 9). Beyond answering questions, every conversation she has with a visitor or author is a source of business intelligence. This module surfaces that intelligence.

**How the extraction works (technical requirement for this module):**

After each Nari conversation ends (detected by: user closes widget, or 15 minutes of inactivity), a background job runs on the conversation transcript. It uses the Anthropic API (or whichever model is accessible) to extract structured data from the conversation. The extraction prompt looks for:

- Person's name (if mentioned)
- Email address (if mentioned — rare, but happens)
- Manuscript title or topic
- Genre or target audience description
- Current manuscript status/stage
- Estimated word count (if mentioned)
- Target publication timeline
- Budget signals (any mention of budget, price sensitivity, or financial constraints)
- Pain points (frustrations with previous publishers, specific concerns)
- Competitor mentions
- Specific services of interest
- Overall intent level (HIGH / MEDIUM / LOW based on specificity and urgency of questions)
- Questions asked (list)

This extracted data is stored as a `NariConversationIntelligence` record linked to the conversation log.

**The Feed (main view):**

A list of recent Nari conversations, most recent first. Each card shows:

- Timestamp and duration
- Platform (narriva.com — Kekere doesn't have Nari)
- Intent badge: `HIGH INTENT` / `MEDIUM` / `LOW` / `BROWSING`
- Extracted highlights (up to 3 key signals): e.g. *"Manuscript ready · 80,000 words · Wants full service"*
- Name and email if captured
- Preview of first message

**Clicking a card expands to:**

Full conversation transcript (scrollable, clearly formatted as a back-and-forth)

Below the transcript: the structured extracted data in a clean summary card:

```
EXTRACTED INTELLIGENCE
─────────────────────────────
Name:              John Adeyemi (mentioned in conversation)
Email:             Not captured
Manuscript:        "The Weight of Lagos" — literary fiction
Status:            First complete draft, ~80,000 words
Services interest: Full publishing service (mentioned explicitly)
Timeline:          "Hoping to publish before end of year"
Budget signal:     Asked about pricing twice — possible concern
Pain points:       "My last attempt at self-publishing didn't go well"
Intent:            HIGH
─────────────────────────────
```

**Action buttons per conversation:**
- `Create Lead` — saves this person as a lead in the CRM-lite pipeline, pre-populated with extracted data
- `Link to existing author` — if you recognise this as an existing submission or client, link the conversation to their record
- `Flag for follow-up` — adds a task to the admin pending queue: "Follow up with [Name]"
- `Dismiss` — marks as reviewed, removes from the active feed (conversation remains in history)

**CRM-Lite Pipeline view:**

A Kanban-style pipeline of all leads created from Nari conversations:

```
NEW → CONTACTED → IN DISCUSSION → SUBMITTED → WON → LOST
```

Each lead card: name, manuscript topic, intent level, date first contacted, last activity date.

Admin can drag between columns or use a status dropdown. Clicking a lead shows their full profile including the original conversation, extracted data, and any notes added by the admin team.

This becomes Narriva's lightweight sales pipeline — not a full CRM, but enough to track where every interested author is in the journey from "chatted with the bot" to "manuscript submitted."

**Intelligence summary (top of the module):**

- Total conversations this week / month
- HIGH INTENT conversations this week
- Leads created this month
- Conversion rate: leads → actual submissions

---

---

## MODULE D: Kekere — Content, Community & Economy

---

### D1: Story Review Queue

The most frequently used Kekere admin feature. Stories writers submit for review land here.

**Queue display:**

Default sort: oldest first (fairness — first in, first reviewed). Filter: SUBMITTED / REVISIONS_REQUESTED (separate tabs or filter pills).

Each row:
- Story title
- Author username + name
- Word count
- Tier the author selected (Standard / Featured / Premium)
- Submitted date
- Days waiting (highlighted orange at 5 days, red at 7+ — goal is 5-7 business day turnaround)

**Story detail view (clicking a row):**

Two-panel layout:

Left (story content, 65%):
- Title + hook line at top
- Full story text (readable, formatted — same Inter/reading treatment as the Kekere reader, so it's actually pleasant to read during review)
- Word count + estimated reading time displayed at top

Right (author + decision panel, 35%):

Author info:
- Name, username, join date
- Previously published stories (count + links)
- Previous rejections or revision requests (pattern matters for context)
- Their selected tier and cowrie cost

Decision controls:

`PUBLISH` (green button):
- Confirm or adjust the tier (dropdown: Standard / Featured / Premium)
- Confirm or adjust the cowrie cost (number input, pre-filled with what the writer set, with the tier range shown below as a reference: e.g. "Standard: 10-30 cowries")
- Optional: add a short editorial note for the writer (congratulatory, not required)
- Optionally toggle "Feature this story" to pin it in the feed
- Confirm → story goes live immediately

`REQUEST REVISIONS` (orange button):
- Required: revision notes field (what specifically needs to change — this is shown verbatim to the writer)
- Optional: private editor note (not shown to writer)
- Confirm → story status becomes REVISIONS_REQUESTED, writer notified

`REJECT` (red button):
- Required: feedback field for the writer (constructive — explain what isn't working)
- Required: private reason (not shown to writer — for internal records: Plagiarism suspected / Quality below threshold / Policy violation / Other)
- If plagiarism suspected: a separate "Flag as plagiarism" checkbox auto-sets plagiarismFlagged: true and routes to a separate flagged content admin queue
- Confirm → story status becomes REJECTED, writer notified

`BACK TO DRAFT` (grey button): returns a REVISIONS_REQUESTED story to DRAFT without sending any notification. Use case: if admin made a mistake on the revision request.

**Keyboard shortcuts for the review queue (efficiency feature for heavy use):**
- `P` → Publish
- `R` → Request revisions
- `X` → Reject
- `N` → Next story in queue

---

### D2: Published Stories Library

All published Kekere stories. For ongoing content management.

**Filter options:** genre, tier, author, date published, featured status, performance tier (high/medium/low unlock count).

**Table columns:** Title · Author · Tier · Cost · Unlocks (total) · Completion Rate · Earnings (cowries to author) · Published date · Featured?

**Actions per story:**
- `Unpublish` (prompts for reason, sends notification to writer, cowries refunded to readers who unlocked it — add this refund logic to the spec, it wasn't previously defined)
- `Edit tier / cost` (prompts for reason logged internally)
- `Feature / Unfeature` (pins story to top of feed or removes pin)
- View full story (same reading view as the review queue)
- View story analytics (unlocks over time, completion rate chart, reader demographics if tracked)

**Reported stories:**
If Kekere has a "Report this story" button (a good-to-have for content moderation), reported stories appear with a flag count badge. Stories with 3+ reports are automatically surfaced for admin review.

---

### D3: Trending & Performance

**Top stories** (configurable time window: last 7d / 30d / all time):
- Top 10 by total unlocks — bar chart
- Top 10 by completion rate — bar chart
- Top 10 by unlock velocity (rate of growth, not just total) — identifies breakout stories

**Genre performance:**
Which genres generate the most unlocks, the highest completion rates, the most saves. Informs editorial strategy and competition themes.

**Dead content tracker:**
Published stories with 0 unlocks in the last 30 days. These may benefit from being featured, or from being quietly unpublished if they've been live for 6+ months with no traction. Admin can take action directly from this view.

**Writer performance table:**
Top writers ranked by total earnings (cowries distributed to them), total unlocks, completion rate across their portfolio. Useful for identifying writers worth approaching with a publishing contract.

---

### D4: Competitions Management

Build on Phase 13's competition backend with proper admin tooling.

**Competitions list:** all competitions in all states (DRAFT / OPEN / CLOSED / JUDGING / COMPLETE).

**Create / Edit competition:**
- Title, theme (rich text — the prompt itself may need to be detailed)
- Open date + deadline
- Word count range (min + max)
- Prize description (rich text — can include the "Narriva manuscript read" prize if it's a seasonal competition)
- Status controls: move through the lifecycle manually

**Entries view (per competition, once OPEN):**
- Table of all submitted stories
- Each row: story title, author, word count, submitted date, moderation status (whether the story has passed review)
- Filter: reviewed / pending review

**Winner selection (when competition is in JUDGING):**
- Admin can mark up to 3 stories with placement (1st / 2nd / 3rd)
- Optional: shortlist stories without placement
- Mark competition COMPLETE → winners are published on the competition detail page, notifications sent

---

### D5: Publishing Contracts (Kekere Writers)

A contract management system for formalising relationships with Kekere writers.

**Contract templates (admin-managed):**
A library of contract templates. Each template has:
- Template name (internal reference)
- Contract type (Exclusive story deal / Anthology inclusion / Competition winner agreement / Other)
- Variable placeholders: {{writer_name}}, {{story_titles}}, {{payment_amount}}, {{duration}}, {{exclusivity_terms}}
- Contract body (rich text / formatted text — this is the legal document content. Note: as with the Narriva publishing agreement, the actual legal text should be reviewed by a lawyer. Admin manages the template; the system doesn't generate legal language automatically.)

**Send a contract:**
1. Select template
2. Select writer (search by username or name)
3. Fill in the variable fields
4. Preview the rendered contract (shows exactly what the writer will see)
5. "Send to writer" → pushes to their Kekere contracts inbox

**Contracts dashboard:**

| Writer | Contract Type | Sent Date | Status | Signed Date | Expiry |
|---|---|---|---|---|---|
| @chinwe.writes | Competition winner | 1 Jul 2026 | Signed ✓ | 3 Jul 2026 | — |
| @emeka.stories | Anthology | 5 Jul 2026 | Pending... | — | Expires 12 Jul |
| @adaeze.k | Exclusive deal | 8 Jul 2026 | Declined | — | — |

Status badges: `PENDING` / `SIGNED ✓` / `DECLINED` / `EXPIRED`

Filter by status, contract type, date range.

Actions:
- Download signed contract PDF
- Resend reminder (for pending contracts near expiry)
- Void a contract (prompts for reason)

**What writers see (in their Kekere app):**
A "Contracts" section in their profile. Pending contracts show a notification badge. Clicking opens the contract reader (clean, formatted, the full contract text). Two buttons at the bottom: `I agree and sign` / `Decline`. If they sign, they're asked to type their full legal name as a signature, which is captured alongside their IP address and a timestamp for the PDF record.

---

### D6: Cowrie Economy

The financial health of Kekere's virtual currency system.

**Economy overview (top metrics):**

| Metric | Value |
|---|---|
| Total cowries ever issued (lifetime) | X |
| Cowries currently in user wallets | X |
| Cowries spent on unlocks (lifetime) | X |
| Cowries pending withdrawal | X |
| Cowries distributed to writers (earnings) | X |
| Platform-retained cowries (platform fee on unlocks) | X |

These six numbers should always add up correctly. If total issued ≠ in wallets + spent + withdrawn, there's an accounting error. Build a daily reconciliation check that alerts admin if the numbers don't balance.

**Revenue charts:**
- Top-up revenue (NGN): daily/weekly/monthly line chart
- Unlock revenue (cowries): daily/weekly/monthly (shows content consumption trends)
- Revenue split: Narriva share vs writer earnings

**Economy health indicators:**
- Average cowrie balance per active user (too high = cowries not being spent, products not converting)
- Average unlocks per active user per week (engagement depth)
- Top-up conversion rate: % of users who have ever bought cowries (out of all registered users)
- Repeat top-up rate: % of top-up users who have topped up more than once

**Top-up breakdown by package:**
Which of the four packages (₦500 / ₦1,000 / ₦2,500 / ₦5,000) is most popular. Helps pricing decisions.

---

### D7: Withdrawal Requests

Writers earn cowries when their stories are unlocked (per the writer earnings model decided in the Decisions Required section). When they accumulate enough, they can request to withdraw as NGN.

**The withdrawal request flow (writer side, in Kekere app):**

Writer goes to `/wallet`:
- Sees their "Earned" balance (cowries earned from story unlocks, separate from their "Spending" balance from top-ups — these should be separate wallet buckets, not combined)
- If earned balance ≥ minimum threshold: "Request withdrawal" button appears
- Clicking opens a form:
  - Withdrawal amount (cowries, up to their earned balance)
  - NGN equivalent shown in real-time (earned cowries → NGN at the withdrawal rate, defined in Decisions Required)
  - Bank account details (if not already on file): bank name, account number, account name
  - Note: first-time withdrawal may require ID upload for KYC (flag as a policy decision)
- Submit → creates a `WithdrawalRequest` record with status PENDING, notifies admin

**Admin withdrawal queue:**

| Writer | Cowries | NGN Value | Bank Details | Requested | Days Waiting | Status |
|---|---|---|---|---|---|---|

Status filter: PENDING / APPROVED / PROCESSING / COMPLETED / REJECTED

**Each request detail view:**
- Writer info + link to their profile
- Earned balance history (how they accumulated this)
- Bank details on file
- Any previous withdrawal requests and their outcomes

**Decision controls:**

`APPROVE`:
- Confirms the payout amount
- Initiates payout (either manually — admin notes the bank transfer reference — or via Paystack Transfers API if integrated)
- Status → PROCESSING, then admin marks COMPLETED once transfer clears

`REJECT`:
- Required: reason (shown to writer)
- Options: Insufficient verification / Bank details don't match / Suspicious activity / Other
- Cowries are returned to their earned balance

`HOLD`:
- Flags for further review without rejecting
- Admin can add an internal note explaining why it's on hold

**Payout history:**
All completed withdrawals, amount (cowries + NGN), transfer reference, writer name, date. This is the ledger of money out of the business.

---

### D8: Kekere User Analytics

**Engagement metrics:**
- DAU (daily active users) — rolling 30-day chart
- WAU (weekly active users)
- MAU (monthly active users)
- DAU/MAU ratio: the "stickiness" metric. 20%+ is good, 50%+ is excellent.

**User type breakdown:**
- Readers only (have never submitted a story): count + trend
- Writers (have at least one submitted or published story): count + trend
- Both (read and write): count + trend

**Content consumption:**
- Average stories read per active user per week
- Average reading time per session
- Peak usage hours (24-hour heatmap) — especially relevant for knowing when to publish new stories or run competitions

**Top readers / Top writers:**
Leaderboard tables (anonymised option: admin can toggle between showing usernames or anonymising for internal discussions).

**Geographic breakdown:**
Where Kekere's users are — country, state/city for Nigeria. Useful for competition prize decisions (physical prizes need delivery planning) and for understanding where the writer community is concentrated.

---

---

## MODULE E: All Users (Platform-Wide)

A unified user table covering everyone on both platforms.

**Columns:** Name · Email · Role · Joined · Last Login · Platform (Narriva activity / Kekere activity) · Status (Active / Suspended / Deletion Requested)

**Filters:** role, status, platform activity, join date range.

**User detail view:**
- Profile info
- Activity summary: submissions, stories, orders, unlocks, wallet balance
- Nari conversation history (if any)
- Full wallet transaction log
- Action log (all admin actions taken on this account, with timestamps)

**Admin actions (with confirmation required for all):**
- `Change role` (READER / WRITER / ADMIN)
- `Suspend` — blocks login, prompts for reason and duration (temporary vs indefinite). Suspended users see a "Your account has been suspended" message on login attempt.
- `Unsuspend`
- `Manually adjust cowrie balance` — credit or debit, requires a mandatory reason field. Creates an audit log entry.
- `Initiate account deletion` — triggers Phase 16's deletion flow from the admin side
- `View as user` (impersonation) — allows admin to see exactly what this user's account looks like. Every impersonation session is logged: which admin, which user, timestamp, duration.

---

## MODULE F: Settings & Configuration

Admin-managed platform settings that should be changeable without a code deploy.

**Content settings:**
- Nari FAQ knowledge base editor: the Q&A pairs from Phase 9, editable in a simple list (add, edit, delete Q&A pairs). Changes take effect immediately.
- Service pages: toggle which services are currently being offered (in case one is paused)
- Competition templates

**Economy settings:**
- Cowrie top-up packages: the four packages from `decisions.ts` should be editable here — changing from ₦500=100 to ₦600=100 shouldn't require a code change
- Writer earnings rate: the % of each unlock that goes to the author (once decided)
- Withdrawal exchange rate: cowries to NGN for withdrawals
- Minimum withdrawal threshold

**Contract templates:** the template library for Kekere publishing contracts — CRUD interface.

**Email templates:** view and edit the Resend email templates from Phase 17. At minimum, the subject lines and first paragraph of each template should be editable here.

**Feature flags:**
Toggle features on or off without code deploy. Useful for:
- Enabling/disabling cowrie withdrawals (can turn off while setting up payout infrastructure)
- Enabling/disabling new story submissions (if the review queue is backed up)
- Enabling/disabling new Narriva manuscript submissions temporarily

**Admin user management:**
Create new admin accounts, set their permission level (see permissions model below), deactivate admin accounts.

---

## PERMISSIONS MODEL

| Feature | SUPER_ADMIN | EDITOR_NARRIVA | EDITOR_KEKERE | ANALYST | SUPPORT |
|---|---|---|---|---|---|
| Command Center | ✓ Full | ✓ Limited | ✓ Limited | ✓ Read | ✓ Read |
| Traffic Analytics | ✓ | ✓ | ✓ | ✓ | ✗ |
| Book Sales | ✓ | ✓ | ✗ | ✓ | ✗ |
| Submissions | ✓ | ✓ | ✗ | ✗ | ✓ Read |
| Author Projects | ✓ | ✓ | ✗ | ✗ | ✓ Read |
| Nari Intelligence | ✓ | ✓ | ✗ | ✓ Read | ✗ |
| Story Review Queue | ✓ | ✗ | ✓ | ✗ | ✗ |
| Cowrie Economy | ✓ | ✗ | ✓ | ✓ Read | ✗ |
| Withdrawal Requests | ✓ | ✗ | ✓ | ✗ | ✗ |
| Contracts | ✓ | ✗ | ✓ | ✗ | ✗ |
| All Users | ✓ | ✗ | ✗ | ✗ | ✓ Limited |
| Settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manual cowrie adjust | ✓ | ✗ | ✗ | ✗ | ✗ |
| User impersonation | ✓ | ✗ | ✗ | ✗ | ✓ |

---

---

# PART THREE: BUILD ORDER RECOMMENDATION

Don't try to build this as one giant phase. Break it into sub-phases and ship incrementally.

**Sub-phase 1: Author Portal MVP**
Start here — it has direct client impact and is mostly self-contained. Modules 1-4 of the Author Portal. Admin side: the "Author Projects" section in Module C3 and the ability to upload deliverables.

**Sub-phase 2: Admin Command Center + Narriva ops**
Command Center (without the analytics charts — just the pending queue), Submissions queue (C2), Book Sales basics (C1).

**Sub-phase 3: Kekere content ops**
Story Review Queue (D1), Published Library (D2). These unblock content moderation.

**Sub-phase 4: Analytics**
Traffic & Growth (Module B) — integrate whichever analytics provider was chosen. This is a separate integration effort and shouldn't block the operational tools.

**Sub-phase 5: Cowrie economy + withdrawals**
D6 (economy overview) + D7 (withdrawal requests). Requires the writer earnings model decision to be locked first.

**Sub-phase 6: Nari Intelligence Feed**
C4 — requires the background extraction job, which is the most technically novel piece of this spec.

**Sub-phase 7: Contracts, competitions, settings**
D4 (competitions full tooling), D5 (publishing contracts), Module F (settings).

**Sub-phase 8: Full permissions + audit trails**
The permissions model across all modules, impersonation logging, manual cowrie adjustment audit trail.
