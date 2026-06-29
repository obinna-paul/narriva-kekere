# API Reference — Narriva & Kekere

All endpoints built across phases A1–A15. Admin endpoints require `ADMIN` role unless noted.

---

## A1 — Auth & Core

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Create account (Turnstile CAPTCHA, referral tracking). Feature-flagged: `referral_program`. |
| POST | `/api/auth/[...nextauth]` | Public | NextAuth credential login. Checks `suspended` flag. |
| GET | `/api/auth/me` | Authenticated | Current user profile |

---

## A2 — Kekere Reading & Wallet

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/kekere/stories` | Public | Feed (PUBLISHED only, filters: tier, genre, freeOnly, search, sort) |
| POST | `/api/kekere/stories` | Auth | Submit story for review. Feature-flagged: `story_submissions`. |
| GET | `/api/kekere/stories/[id]` | Auth | Story detail (gated by unlock status) |
| POST | `/api/kekere/stories/[id]/unlock` | Auth | Unlock story (spends cowries, triggers referral reward) |
| POST | `/api/kekere/stories/[id]/complete` | Auth | Mark story as completed (credits completion bonus) |
| POST | `/api/kekere/stories/[id]/tip` | Auth | Send tip to writer |

---

## A3 — Kekere Payments & Referrals

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/kekere/referral` | Auth | Generate referral code |
| POST | `/api/paystack/verify` | Auth | Verify Paystack top-up |
| POST | `/api/webhooks/paystack` | Public (Paystack IP) | Handle Paystack webhooks (top-ups, withdrawals) |

---

## A4 — Kekere Withdrawals & Bank Details

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/kekere/bank-details` | Auth | Save bank details |
| GET | `/api/kekere/withdrawals` | Auth | List withdrawal history |
| POST | `/api/kekere/withdrawals` | Auth | Create withdrawal request. Feature-flagged: `cowrie_withdrawals`. |
| GET | `/api/admin/kekere/withdrawals` | ADMIN | List withdrawals by status |
| GET | `/api/admin/kekere/withdrawals/[id]` | ADMIN | Withdrawal detail + earnings history |
| PUT | `/api/admin/kekere/withdrawals/[id]/approve` | ADMIN | Approve → initiate Paystack transfer. Emails writer. |
| PUT | `/api/admin/kekere/withdrawals/[id]/reject` | ADMIN | Reject + refund earned balance + email |
| PUT | `/api/admin/kekere/withdrawals/[id]/hold` | ADMIN | Set adminNote only |
| GET | `/api/admin/kekere/withdrawals/history` | ADMIN | All COMPLETED withdrawals |

---

## A5 — Author Portal (User-facing)

All portal endpoints require auth + ownership verification (403 for wrong user).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/portal/projects` | Auth | List author's projects (pendingActionCount badge) |
| GET | `/api/portal/projects/[id]` | Auth | Full project detail + stage meta |
| GET | `/api/portal/projects/[id]/deliverables` | Auth | Deliverables grouped by stage (no fileRef) |
| GET | `/api/portal/projects/[id]/deliverables/[did]` | Auth | Single deliverable + signed R2 download URL (15 min) |
| POST | `/api/portal/projects/[id]/deliverables/[did]/approve` | Auth | Author approves → APPROVED + emails admin |
| POST | `/api/portal/projects/[id]/deliverables/[did]/request-changes` | Auth | Request changes → CHANGES_REQUESTED |
| POST | `/api/portal/projects/[id]/deliverables/[did]/comment` | Auth | Add comment (any status) |
| GET | `/api/portal/projects/[id]/messages` | Auth | Messages (isInternal=false only) |
| POST | `/api/portal/projects/[id]/messages` | Auth | Post message |
| GET | `/api/portal/projects/[id]/documents` | Auth | Documents with signed download URLs |

---

## A6 — Admin Project Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/narriva/submissions/[id]/accept` | ADMIN | Accept submission → create AuthorProject + email |
| GET | `/api/admin/narriva/projects` | ADMIN | All projects (pendingAuthorActions, pendingAdminActions) |
| GET | `/api/admin/narriva/projects/[id]` | ADMIN | Full detail (all comments incl. internal, all messages, tasks) |
| PUT | `/api/admin/narriva/projects/[id]/stage` | ADMIN | Advance stage + post message |
| POST | `/api/admin/narriva/projects/[id]/deliverables` | ADMIN | Upload file (multipart) → new or versioned deliverable |
| POST | `/api/admin/narriva/projects/[id]/messages` | ADMIN | Post message (internal toggle) |
| PUT | `/api/admin/narriva/projects/[id]/messages/[mid]/pin` | ADMIN | Pin message with label |
| POST | `/api/admin/narriva/projects/[id]/documents` | ADMIN | Upload document (multipart) |
| POST | `/api/admin/narriva/projects/[id]/tasks` | ADMIN | Create task |
| GET | `/api/admin/narriva/tasks` | ADMIN | Cross-project task board |
| PUT | `/api/admin/narriva/tasks/[id]/status` | ADMIN | Update task status |

---

## A7 — Submissions Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/submissions` | ADMIN | List submissions (optional status filter) |
| POST | `/api/submissions` | Public | Submit manuscript (multipart). Feature-flagged: `manuscript_submissions`. Emails author on RECEIVED. |
| GET | `/api/submissions/[id]` | ADMIN | Single submission |
| PATCH | `/api/submissions/[id]` | ADMIN | Update status/stage/notes. Emails author on DECLINED. |

---

## A8 — Kekere Contracts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/kekere/contract-templates` | ADMIN | List templates (no body) |
| POST | `/api/admin/kekere/contract-templates` | ADMIN | Create template |
| GET | `/api/admin/kekere/contract-templates/[id]` | ADMIN | Full template with body |
| PUT | `/api/admin/kekere/contract-templates/[id]` | ADMIN | Update template |
| DELETE | `/api/admin/kekere/contract-templates/[id]` | ADMIN | Delete (blocks if contracts exist) |
| GET | `/api/admin/kekere/contracts` | ADMIN | List contracts (filters, pagination) |
| POST | `/api/admin/kekere/contracts` | ADMIN | Send contract (renders variables, emails writer) |
| GET | `/api/admin/kekere/contracts/[id]` | ADMIN | Full detail |
| PUT | `/api/admin/kekere/contracts/[id]/void` | ADMIN | Void PENDING contract |
| POST | `/api/admin/kekere/contracts/[id]/remind` | ADMIN | Resend reminder (24h rate limit) |
| GET | `/api/kekere/contracts` | Auth | Writer's contracts |
| GET | `/api/kekere/contracts/[id]` | Auth | Full detail (auto-expires) |
| POST | `/api/kekere/contracts/[id]/sign` | Auth | Sign → PDF generation, R2 upload, emails |
| POST | `/api/kekere/contracts/[id]/decline` | Auth | Decline → emails admin + writer |
| GET | `/api/kekere/contracts/[id]/download` | Auth | Signed PDF download URL |
| GET | `/api/admin/cron/expire-contracts` | Cron (Bearer CRON_SECRET) | Auto-expire stale PENDING contracts |

---

## A9 — Nari Chatbot Intelligence

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/nari/ask` | Public | Chat. Logs conversation, checks end heuristics, triggers extraction. |
| POST | `/api/nari/end-session` | Public | End session explicitly, trigger extraction. |
| GET | `/api/admin/nari/conversations` | ADMIN | List conversations (intel, pagination) |
| GET | `/api/admin/nari/conversations/[id]` | ADMIN | Full transcript with intel |
| POST | `/api/admin/nari/leads` | ADMIN | Create lead from conversation |
| GET | `/api/admin/nari/leads` | ADMIN | List leads (status/intentLevel filters) |
| PUT | `/api/admin/nari/leads/[id]` | ADMIN | Update lead status/notes |

---

## A10 — Nari FAQ Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/nari/faq` | ADMIN | List FAQ items |
| POST | `/api/admin/nari/faq` | ADMIN | Create FAQ item |
| PUT | `/api/admin/nari/faq/[id]` | ADMIN | Update FAQ item |
| DELETE | `/api/admin/nari/faq/[id]` | ADMIN | Soft-delete (active=false) |
| PUT | `/api/admin/nari/faq/reorder` | ADMIN | Bulk reorder by ids |

---

## A11 — Admin Story Moderation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/kekere/stories/queue` | ADMIN | Stories in review queue (oldest first) |
| GET | `/api/admin/kekere/stories/[id]/review` | ADMIN | Full story with author profile |
| PUT | `/api/admin/kekere/stories/[id]/publish` | ADMIN | Publish (validates cowrieCost 2-6, emails writer) |
| PUT | `/api/admin/kekere/stories/[id]/request-revisions` | ADMIN | Request revisions (emails writer) |
| PUT | `/api/admin/kekere/stories/[id]/reject` | ADMIN | Reject (emails writer) |
| GET | `/api/admin/kekere/stories/published` | ADMIN | All published (sortable by unlocks/completion) |
| PUT | `/api/admin/kekere/stories/[id]/unpublish` | ADMIN | Unpublish → DRAFT (emails writer) |
| PUT | `/api/admin/kekere/stories/[id]/feature` | ADMIN | Toggle featured flag |

---

## A12 — Admin Economy & Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/kekere/economy/overview` | ADMIN | Reconciliation + topup breakdown + conversion rates |
| GET | `/api/admin/kekere/economy/timeseries` | ADMIN | Time-series data (topup_ngn, unlock_count, new_wallets) |
| GET | `/api/admin/kekere/users/analytics` | ADMIN | DAU/WAU/MAU, reader/writer counts, top users |

---

## A13 — Platform Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/settings` | ADMIN | All PlatformSettings + FeatureFlags |
| PUT | `/api/admin/settings/[key]` | ADMIN | Update setting (whitelist, per-key validation) |
| PUT | `/api/admin/settings/feature-flags/[key]` | ADMIN | Update feature flag |

### Allowed Setting Keys
`monthly_revenue_target_ngn`, `writer_earnings_rate`, `referral_reward_cowries`, `completion_bonus_cowries`, `tip_amount_cowries`, `withdrawal_rate_ngn_per_cowrie`

### Allowed Feature Flags
`cowrie_withdrawals`, `story_submissions`, `manuscript_submissions`, `referral_program`

---

## A14 — Admin BI & Book Sales

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/command-center` | ADMIN | Combined KPI dashboard |
| GET | `/api/admin/narriva/overview` | ADMIN | Projects, submissions, sales, Nari pipeline |
| GET | `/api/admin/narriva/book-sales/overview` | ADMIN | Revenue all-time/month/week, units, best seller |
| GET | `/api/admin/narriva/book-sales/by-book` | ADMIN | Per-book revenue (price>0 only) |
| GET | `/api/admin/narriva/book-sales/timeseries` | ADMIN | Daily revenue + units (30d) |
| GET | `/api/admin/narriva/book-sales/[id]/timeseries` | ADMIN | Single-book daily revenue |
| GET | `/api/admin/narriva/book-sales/revocations` | ADMIN | All revocations |
| GET | `/api/admin/nari/pipeline/summary` | ADMIN | Conversations, high-intent, leads, conversion |
| GET | `/api/admin/analytics/traffic-overview` | ADMIN | GA4: sessions, users, pageviews, bounce rate |
| GET | `/api/admin/analytics/acquisition` | ADMIN | GA4: channels, referrers, landing pages |
| GET | `/api/admin/analytics/geographic` | ADMIN | GA4: countries, cities, devices, OS |
| GET | `/api/admin/analytics/user-growth` | ADMIN | GA4: daily new users |
| GET | `/api/admin/analytics/funnels` | ADMIN | GA4: Narriva + Kekere conversion funnels |
| GET | `/api/admin/analytics/growth-summary` | ADMIN | Combined MoM growth + revenue target |

---

## A15 — Admin User Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/users/[id]` | ADMIN | Full user detail (suspension, wallet, action log) |
| POST | `/api/admin/users/[id]/suspend` | ADMIN | Suspend user (optional durationDays) |
| POST | `/api/admin/users/[id]/unsuspend` | ADMIN | Unsuspend user |
| GET | `/api/admin/users/[id]/action-log` | ADMIN | All AdminAction records for user |
| POST | `/api/admin/users/[id]/adjust-cowries` | ADMIN | Manual cowrie adjustment (super_admin_email gated) |
| POST | `/api/admin/impersonate/[userId]` | ADMIN | Start impersonation (15-min JWT) |
| POST | `/api/admin/impersonate/end` | ADMIN | End impersonation |

---

## Feature Flag Reference

| Flag | Endpoints Gated | Default |
|------|----------------|---------|
| `cowrie_withdrawals` | `POST /api/kekere/withdrawals` | `true` |
| `story_submissions` | `POST /api/kekere/stories` | `true` |
| `manuscript_submissions` | `POST /api/submissions` | `true` |
| `referral_program` | Registration referral recording | `true` |

## Setting Reference

Settings are cached for 5 minutes and invalidated on PUT. All fall back to `decisions.ts` constants if the DB row is missing.

---

## Authentication Notes

- All admin endpoints require `ADMIN` role via `withAuth({ roles: ["ADMIN"] })`
- User-facing endpoints use `withAuth()` (any authenticated user)
- Password hashes are never returned in any API response — all user queries use explicit `select:` 
- Raw R2 fileRef paths are never exposed to clients — always converted to signed URLs (15 min expiry)
- Impersonation is supported via JWT cookie checked in `withAuth()` middleware
