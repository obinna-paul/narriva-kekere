# Handoff: Narriva + Kekere Stories — Full Website UI

## Overview
This package contains the complete UI design for **two independent brands** that share only a login system and backend:

- **Narriva** — a premium publishing house & bookstore (desktop-first). 19 screens.
- **Kekere Stories** — a warm, mobile-first African short-fiction app (mobile-first). 14 screens.

**The single most important rule:** Narriva and Kekere must look like they come from **different companies**. Different colors, type usage, textures, component styles, and tone of voice. The only shared element is auth (which users never see branded) and a plain-text footer link between them. If something feels too close between the two, make it more different.

---

## About the Design Files
The files in `design_files/` are **design references created in HTML** — prototypes that show the intended look, layout, and behavior. **They are not production code to copy directly.**

They are authored in a lightweight component runtime (each `*.dc.html` pairs an HTML template with a small JavaScript logic class, loaded via `support.js`). **You do not need to keep that runtime.** Your task is to **recreate these designs in your own codebase's environment** — React, Vue, Svelte, SwiftUI, etc. — using its established components, design-token system, and patterns. If no environment exists yet, pick the most appropriate framework for the project and implement there.

How to read a design file:
- Styling is **inline** on each element — read the `style="..."` attributes for exact colors, sizes, spacing, radii, and shadows.
- `style-hover="..."`, `style-active`, `style-focus` attributes describe interactive states.
- The `<script class="logic">`-style block (the JS class) holds **state, content data, and event handlers** (`renderVals()` returns the values bound into the template). Read it to understand interactions and what data each screen needs.
- `{{ tokens }}` in the template are data bindings resolved from the logic class — treat them as props/state.
- Repeated rows use `<sc-for list="..." as="x">` (a map/loop) and conditionals use `<sc-if value="...">`.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are all specified. Recreate the UI faithfully using your codebase's libraries — match the hex values, type scale, and spacing below precisely.

---

## Design Tokens

### NARRIVA — palette
| Token | Hex | Usage |
|---|---|---|
| `narriva.bg` | `#FAF8F4` | Dominant surface (warm off-white). NOT pure white. |
| `narriva.bg-alt` | `#F6F3ED` | Alternating section background |
| `narriva.ink` | `#161616` | All body text (near-black) |
| `narriva.blue` | `#1E3A8A` | Royal blue — **accent only** (links, type highlights, buttons). One large field allowed: the submission CTA. Never a page-wide background. |
| `narriva.blue-hover` | `#162C6B` | Button hover |
| `narriva.gold` | `#B08D57` | Muted brass — **used sparingly**: dividers, eyebrows, pull-quote rules. ⚠️ Fails AA on the off-white bg for body text — only use for non-text accents or large/decorative type. For text labels use the darker `#9A7B49`. |
| `narriva.gold-text` | `#9A7B49` | Accessible gold for small eyebrow/label text |
| `narriva.muted` | `#55514A` / `#6B675F` / `#8A857C` | Secondary text tiers |
| border | `rgba(22,22,22,0.07–0.12)` | Hairline dividers |

### NARRIVA — typography
- **Display/headings:** `Fraunces` (serif), weights 400/500/600; italic used for emphasis in headlines. This is the brand voice.
- **Body/UI:** `Inter`, weights 400/500/600.
- Scale (desktop): hero H1 ~62px / section H2 ~40px / card title ~20–24px / body 16–18px / eyebrow 12px uppercase, letter-spacing 0.2em. Generous whitespace; max two competing type sizes per screen.
- Buttons: Inter 14–16px, weight 500–600, `border-radius: 2px` (sharp/editorial).

### KEKERE — palette
| Token | Hex | Usage |
|---|---|---|
| `kekere.primary` | `#C75D2C` | Burnt orange — **can carry large background fields** (hero, CTAs, cards). The loud brand. |
| `kekere.primary-hover` | `#B14E22` | Button hover |
| `kekere.bg` | `#F5EBDD` | Dominant surface (warm sand/cream) |
| `kekere.bg-alt` | `#EFE1CE` | Warmer section background |
| `kekere.dark` | `#2A1A12` | Deep brown-black — body text AND cinematic hero/CTA backgrounds |
| `kekere.dark-2` | `#3A2418` | Elevated dark card surface |
| `kekere.teal` | `#1F4B4B` | Deep teal — **accent only**: genre tags, badges, category labels |
| `kekere.cream` | `#F7EFE3` | Text on dark |
| `kekere.sand-accent` | `#E9C9A3` / `#E08A4A` | Warm highlight tints |
| `kekere.muted` | `#6A5446` / `#8A7565` / `#A08C7C` | Secondary text tiers |
| `kekere.success` | `#1F6F4A` | "Free" / positive amounts |

### KEKERE — typography
- **Display/headings:** `Fraunces` (heavier weight 600/700 — distinct from Narriva's lighter 400/500 use).
- **Body/UI + story reading text:** `Inter` (readability once inside a story).
- Scale (mobile-first 390px): hero H1 `clamp(40px,5.4vw,66px)` / section H2 26–34px / card title 16–17px / body 14.5–17px.
- Buttons: Inter 14–16px, weight 600, `border-radius: 8–12px` (soft, friendly — contrast with Narriva's 2px).
- **Texture:** subtle SVG `feTurbulence` paper grain at ~0.08–0.11 opacity, `mix-blend-mode: overlay`, on dark hero/CTA sections only. Never behind body text. **No decorative blobs or abstract shapes** — warmth comes from color + texture, not shapes.

### Shared spacing / radius / shadow
- Spacing rhythm: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 64 / 80 / 96 px.
- Narriva radius: 2px buttons, 3–8px cards. Kekere radius: 8–18px (softer).
- Card shadow (Narriva): `0 14px 32px -16px rgba(22,22,22,0.34)`, deepens to `0 28px 48px -18px rgba(22,22,22,0.4)` on hover (cover lifts `translateY(-6px)`).
- Kekere story-card shadow: `0 10px 24px -12px rgba(42,26,18,0.4)`.

### Icons
- Use a standard line-icon set in your codebase (e.g. **lucide-react**, the brief's stated preference). The prototypes use minimal inline SVGs as placeholders. Kekere bottom-nav: grid (Feed), pencil (Write), trophy (Competitions), wallet (Wallet), user (Profile). The cowrie symbol is a small filled ellipse with a center slit — replace with a real cowrie-shell glyph/asset.

---

## Screens / Views

### NARRIVA (desktop-first, primary canvas 1280px; nav max-width 1240px)

**Global nav** (sticky, `rgba(250,248,244,0.88)` + blur, hairline bottom border; gains subtle shadow on scroll): wordmark "Narriva" (Fraunces 600, blue) left; links Books · Services (dropdown: Publishing, Editorial, Design, Author Growth, Ghostwriting) · Authors · Blog; right: "Sign in" + "Submit Your Manuscript" button. Mobile: right-slide drawer.
**Global footer:** 4 columns (Services · Bookstore · Company · Legal) + warm gold italic tagline ("We work with authors at every stage…") + socials + © + plain "Visit Kekere Stories" link.

1. **Home** — Hero (Fraunces headline w/ blue italic + composed flat book-cover stack, static, no animation) · Featured Books (horizontal scroll) · "What you get…" numbered 2×3 grid · 6-step process line · Authors grid · Blog teaser · royal-blue submission CTA (the one large blue field).
2. **About** — mission as large pull-quote w/ gold left rule, founder narrative, team grid (3-col). Warmest Narriva page; generous padding. *Code note: single larger profile block if solo-founded.*
3. **How We Work** — long-form editorial: opening, "What we look at" (4 items), vertical 6-step timeline w/ timelines, "How we work with you." Editorial restraint, not cards.
4. **Submit** — left sticky context, right form (name, email, title, genre, manuscript stage, support multi-select checkboxes, synopsis textarea ≥100 words, file upload PDF/DOCX ≤50MB, guidelines checkbox). On submit → replaces form with warm Fraunces confirmation ("We have your manuscript…"), no animation. **State:** `submitted` bool.
5. **Services index** — numbered list of 5 large service rows → detail.
6. **Service detail** (template for all 5) — header w/ warm accent photo, opening para, "What's included" list w/ gold markers, cost block (no public pricing → "let's talk" CTA to /contact), FAQ accordion. **State:** `open` accordion index.
7. **Bookstore** — sticky filter bar (genre dropdown, format chip, sort dropdown → live filter/sort), 3-col book grid; "Buy" emphasized on hover. **State:** `genre`, `sort`.
8. **Book detail** — sticky cover left (40%), right: large Fraunces hook, title, author link, meta, price card w/ "Buy & Read" (solid blue, full-width) + reassurance line; full-width synopsis; "Why we published this" block (gold-tint bg, gold left border, editor signature); author bio; first-chapter excerpt w/ fade-out + "Buy to continue."
9. **Ebook Reader** — its own universe (no global nav). Max width 680px, default Fraunces 18px / line-height 1.7 / bg `#FAF8F4`. Auto-hiding top + bottom chrome (3s). Top progress bar (blue fill on grey track). **Settings panel** (slides from right, the one polished UI element): Font size S/M/L/XL, Font Serif(Fraunces)/Sans(Inter), Line spacing Comfortable 1.7 / Relaxed 1.9 / Open 2.15, Theme Light(`#FAF8F4`/`#161616`) / Sepia(`#F2E8D9`/`#3A2E1A`) / Dark(`#141414`/`#E8E0D0`; accent lightens to `#7D9BEC`). Faint diagonal **email watermark** ~0.08 opacity, repeated. Arrow keys = chapter nav. "Welcome back — Chapter N" banner 1.5s on load. No upsells/ads. **State:** `chromeVisible, settingsOpen, fontSize, font, spacing, theme, chapter, progress, welcome`.
10. **Authors listing** — 3-col grid → detail.
11. **Author detail** — large portrait left (~⅓), name/desc/bio/links, then "Books by [Name]" grid.
12. **Blog listing** — category pill filters (live) + search input, 3-col post grid. **State:** `cat`.
13. **Blog post** — single column ≤720px, category+date, title, inline author w/ photo, featured image, Inter body 18px/1.7, pull-quote (Fraunces + gold left rule), author bio card, "More from category."
14. **Author Portal** (authenticated) — view switch: **Pre-acceptance** (submission status cards w/ plain-language status) ↔ **Post-acceptance** (Submitted→Editorial→Design→Production→Launched stepper + chronological comms log). Notion-meets-publishing-workflow feel. **State:** `view`.
15. **Account Library** — 4-col grid of purchased books w/ reading status + thin progress bar + Continue/Start reading.
16. **Contact** — left details + discovery-call note, right form (name, email, subject dropdown, message).
17. **Help** — tabbed FAQ accordion (For Authors / For Readers / Account & Billing). **State:** `tab, open`.
18. **Legal template** — left sticky TOC (anchor links), right prose (Fraunces headers, Inter body, generous line-height). Props: `docTitle`, `isAgreement` (Publishing-Agreement variant adds a warm yellow-tint banner: "This page describes what our Publishing Agreement covers. The actual contract is provided and signed separately."). Serves Privacy/Terms/Refunds/Copyright/Publishing-Agreement.
19. **404** — editorial: "This page seems to be missing a chapter." + 3 text links.

### KEKERE (mobile-first, primary canvas 375–402px)

**Bottom tab bar** (all authenticated app screens): Feed · Write · Competitions · Wallet · Profile. Active icon = burnt orange; inactive = muted brown-grey `#A08C7C`. Desktop adaptation: top nav w/ same destinations + wordmark.

1. **Home (logged-out marketing)** — Netflix-structured. Hero: cinematic dark (`#2A1A12`) + paper grain + warm radial wash; two-column on desktop (headline left, **staggered story-card wall** right), stacks on mobile; eyebrow, Fraunces headline, subhead, "Start Reading" (orange) + "Browse the catalogue" link, genre tag pills, stat line. Then: "What is Kekere" 3 pillars · Featured stories row (warm geometric thumbnails + teal genre pills + cowrie cost + faded "more" teaser) · Competitions feature card + Narriva line · For Writers split w/ editor mockup · rotating testimonials (auto-advance 4s) · dark final CTA · footer w/ "Part of the Narriva group." **State:** `q` (testimonial index).
2. **Sign in / Sign up** — warm image banner top, pill toggle (Sign in / Create account, orange active), fields, CTA "Start Reading" (keeps brand voice), legal microcopy. **State:** `mode`.
3. **Story Feed** (auth, core daily screen) — header w/ wordmark + cowrie balance chip → wallet; sticky filter pills (New/Trending/Free/Genre); Netflix rows ("New this week", featured full-width banner, "Free reads", "Lagos stories"). **Story card:** geometric thumbnail (abstract/illustrative, African-influenced — NOT photos of people), teal genre pill, Fraunces title, italic 1-line hook, reading time + cowrie cost (or "Free"), optional completion-rate badge (only if >80%). **State:** `filter`.
4. **Story Reader** — full-screen, max 620px, Inter 17px/1.75, sand bg. Auto-hiding chrome (back, title, bookmark, share); top orange progress bar. **Locked state:** ~10% of text → gradient fade → unlock prompt (balance shown above "Unlock for X cowries" button; if insufficient → greyed + "Top up" link; completion-rate social proof). **Unlocked:** full story appears immediately, then "I finished" → **completion end-screen** ("You finished [Title]", 1–5 star rating, Back to feed / Share). Diagonal email watermark ≤0.12 opacity. **State:** `locked, chrome, progress, finished, rating`.
5. **Writer's Editor** — full-screen, no global nav. Top bar: ☰ menu, wordmark, inline editable title, status badge (Draft/Submitted/Published/Revisions), "Saved" autosave, "Submit for review." Hook field (label "One sharp sentence…", char count nudges at 150), full-height body textarea, live word count + reading time. Left sidebar (☰): tier radios (Standard/Featured/Premium w/ cowrie ranges) + competition selector. **Submit modal:** "Ready for other eyes?" copy, Cancel (ghost) / Submit (orange). **State:** `title, hook, body, sidebarOpen, submitOpen, tier`.
6. **Competitions listing** — header "Enter the conversation", cards w/ status badge (Open=orange / Judging=teal / Complete=dark / Closed=grey), deadline countdown if open, prize, → detail.
7. **Competition detail** — dark hero + countdown timer (live, ticking), "The prompt", "Rules" list, "The prize" (incl. the Narriva manuscript-read line), "Submit your story" (before deadline). **State:** live `now` tick.
8. **Wallet** — dark balance hero (large Fraunces number + cowrie glyph), "Top up" button → **bottom sheet**: "Add cowries", 4 selectable package cards (₦500/100, ₦1,000/210 +10 bonus, ₦2,500/550 +50, ₦5,000/1,150 +150; bonus highlighted orange), "Pay with Paystack." Transaction history list (↑ top-up green / ↓ unlock, description, ± amount, date). **State:** `sheetOpen, pkg`.
9. **Profile** — avatar (orange ring), name, bio; writer stats (Published/Reads/Cowries earned) + reader stats (Read/Saved); "Edit profile" ghost button → edit view (avatar, name, bio ≤160 chars). **State:** `editing`.
10. **Library** — tabs Saved / Unlocked / Reading History; compact story-card list; progress bar + "Continue reading" on in-progress. **State:** `tab`.
11. **Help** — tabbed FAQ accordion (For Readers / For Writers / Cowries & Wallet / Account). Friendliest page. **State:** `tab, open`.
12. **404** — dark, "This story has gone missing." + "Back to the feed."

---

## Interactions & Behavior
- **Transitions:** chrome auto-hide 0.35s ease; settings/sheets slide 0.4s cubic-bezier(.2,.8,.2,1); card hover lift 0.3–0.35s. Reader chrome hides after **3s** of no scroll/move/tap, reappears on any.
- **Reader watermark:** repeated diagonal user-email at low opacity (Narriva 0.08, Kekere ≤0.12) for screenshot attribution — must stay subtly legible, never distracting.
- **Live timers:** competition countdown ticks every 1s; testimonials rotate every 4s.
- **Filters/sorts/tabs/accordions:** all client-side state, no reload.
- **Keyboard:** Narriva reader ← / → change chapter. Every modal should trap focus; every icon-only button needs an `aria-label` (already present in prototypes).
- **Responsive:** Narriva designed at 1280px (must work on mobile via drawer nav + stacked grids). Kekere designed at 375px first (desktop = adaptation: bottom nav → top nav).

## State Management
Each screen's needed state is listed under its entry above. No global store required beyond: **auth/session**, **cowrie balance** (Kekere, shared across feed/reader/wallet), **reading progress per book/story** (persist so readers resume), and **purchased/unlocked library**. Data fetching: books, stories, authors, blog posts, competitions, submissions, transactions — all currently hard-coded sample data in each logic class (read them for the shape).

## Accessibility (non-negotiable, target WCAG 2.1 AA)
- 4.5:1 contrast for normal text, 3:1 for large. ⚠️ Narriva gold `#B08D57` on `#FAF8F4` fails for body text — use `#9A7B49` for small text or restrict gold to non-text/large decorative use.
- One `<h1>` per page, logical heading nesting. Every input labeled; validation errors announced. Modals trap focus. Icon buttons have aria-labels. Meaningful alt text; decorative images empty alt.

## Assets
All imagery in the prototypes is **placeholder**:
- **Narriva book covers** — flat typographic placeholders (solid literary color + Fraunces title). Replace with **real photographed books** (physical objects w/ weight/shadow), per brief — not 3D mockups.
- **Author/team/blog photos** — striped placeholder blocks labeled in monospace. Replace with warm, natural photography (set, not random stock).
- **Kekere story thumbnails** — CSS geometric gradient patterns (warm, African-influenced). Replace with abstract/illustrated cover art (no photos of people).
- **Kekere cowrie symbol** — simple SVG ellipse placeholder → replace with a real cowrie-shell icon.
- **Fonts** — Fraunces + Inter (Google Fonts).

## Files
All under `design_files/` (open `Index.dc.html` first — it's a clickable directory of every screen). `support.js` is the prototype runtime (reference only — not needed in your build). Narriva screens are prefixed `Narriva - `, Kekere `Kekere - `.

---

## How to use this with Claude Code
1. Drop the whole `design_handoff_narriva_kekere/` folder into your repo (e.g. `/docs/design/`).
2. In Claude Code, point it at this README first, then a specific screen, e.g.:
   > "Read `docs/design/README.md`. Then implement the Kekere Story Feed (`design_files/Kekere - Feed.dc.html`) as a React component using our existing component library and Tailwind tokens. Match the colors, type scale, and spacing in the README exactly. Don't copy the HTML — rebuild it in our patterns."
3. Recommended order: (a) add the two brands' tokens to your design-system/theme config from the **Design Tokens** section; (b) build shared primitives (Button, Input, Card, Modal, nav shells) per brand; (c) build screens, brand by brand. Keep the two brands in separate theme scopes so they never bleed.
4. Tackle one screen per prompt for best fidelity; give Claude Code the README + the one `*.dc.html` each time.
