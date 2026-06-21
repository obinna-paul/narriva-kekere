# Narriva & Kekere Stories

A single Next.js codebase serving two independent web platforms that share only
a backend.

1. **Narriva** (`narriva.com`) — a selective book publishing house with a public bookstore.
2. **Kekere Stories** (`kekere.narriva.com`) — a separate short-fiction reading and writing app.

## Brand independence rule

**Narriva and Kekere are fully independent brands.** They do not share a visual
identity, typography, marketing copy, or editorial pipeline. There is no
"Kekere feeds talent into Narriva" feature anywhere in this product.

The *only* things the two brands share are:

- The user database and login system (one account works on both).
- The admin backend.
- The Paystack payment integration.
- A baseline component grid/icon system, used for engineering consistency only.

When in doubt in any future phase, default to keeping the two brands completely
separate in every way except authentication and the underlying database. Do not
introduce a shared "brand" design token, a shared layout that styles both, or
copy that references one brand from the other's surface.

## Project structure

```
src/
├── app/
│   ├── (narriva)/        # Narriva routes — serves "/" on narriva.com
│   ├── (kekere)/         # Kekere routes — see "Routing" below
│   ├── api/               # Shared API routes (auth, payments, etc.)
│   └── layout.tsx         # Root HTML shell only — no brand styling here
├── components/
│   ├── ui/                # Shared primitives only — no brand styling baked in
│   ├── narriva/           # Narriva-only components
│   └── kekere/            # Kekere-only components
├── lib/
│   ├── db/                 # Shared database access
│   ├── auth/                # Shared auth (one account, both brands)
│   └── utils/                # Shared utilities (cn(), etc.)
├── content/
│   └── decisions.ts        # Source of truth for locked business constants
└── styles/
    └── globals.css          # Global reset only — no brand colors/fonts here
```

Brand-specific layouts live in `(narriva)/layout.tsx` and `(kekere)/layout.tsx`,
each applying only its own Tailwind theme tokens (`narriva-*` / `kekere-*`,
defined in `tailwind.config.ts`). The root `layout.tsx` stays brand-neutral.

## Routing: route groups today, subdomains in production

`(narriva)` and `(kekere)` are Next.js **route groups** — they organize files
without adding a URL segment. That matters here because two route groups can't
both serve `/` (Next.js treats it as a route collision at build time). To keep
both groups live locally without colliding:

- `(narriva)/page.tsx` serves `/` — this is the real, public Narriva home.
- `(kekere)`'s actual page lives at `(kekere)/kekere/page.tsx` (URL `/kekere`).
- `src/middleware.ts` rewrites requests with a `kekere.` hostname prefix from
  `/` to `/kekere` internally, so the public URL on the Kekere subdomain still
  looks like `/`.

**Local dev:** add `127.0.0.1 kekere.localhost` to your hosts file, then visit
`http://kekere.localhost:3000` for Kekere and `http://localhost:3000` for
Narriva.

**Production:** the same middleware approach maps real subdomains —
`narriva.com` → Narriva, `kekere.narriva.com` → Kekere. Hardening the
production logic (explicit hostname allow-list, `www`/apex handling, preview
deployment hostnames, etc.) is deferred to the deployment phase; the local-dev
rewrite above is the minimal version needed to make the two brands buildable
and navigable today.

## Business constants

`src/content/decisions.ts` is the single source of truth for locked business
decisions — company name, domains, cowrie top-up packages, story tier cowrie
ranges, etc. Import from this file instead of re-specifying these values
anywhere else in the codebase.

## Database & auth

`prisma/schema.prisma` is the single source of truth for the shared database
— one `User` table, one login, used by both brands. Several models include
fields that aren't used until later phases (moderation notes, order
fulfillment, legal consent timestamps) — they're included now to avoid
disruptive migrations later; see the inline comments in the schema for which
phase introduces each one.

Auth is NextAuth.js (Credentials provider, bcrypt-hashed passwords, JWT
session strategy — database-strategy sessions don't populate automatically
for Credentials logins, so JWT is required here). The session cookie is
scoped to `.narriva.com` in production so a login on either brand carries
over to the other; locally there's no shared parent domain between
`localhost` and `kekere.localhost`, so the cookie falls back to per-host
during development (see `src/lib/auth/options.ts`).

- `src/lib/db/prisma.ts` — Prisma client singleton
- `src/lib/auth/options.ts` — NextAuth config
- `src/lib/auth/middleware.ts` — `getCurrentSession()` / `withAuth()` route protection
- `src/lib/auth/roles.ts` — `hasRole()` / `requireRole()` RBAC helpers
- `src/app/api/auth/[...nextauth]/route.ts`, `register/route.ts`, `me/route.ts`

### Setting up the database

```bash
cp .env.example .env          # fill in DATABASE_URL with a real Postgres connection string
npx prisma migrate dev --name init
```

The schema has been validated and the Prisma client generated against it
(`npx prisma generate`), but no migration has been run yet in this repo —
that needs an actual reachable Postgres instance (local, Docker, or a hosted
free tier like Neon/Supabase/Railway).

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for Narriva, or
`http://kekere.localhost:3000` for Kekere (see hosts file note above).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (two independently namespaced theme token sets — see
  `tailwind.config.ts`)
- Prisma + PostgreSQL (shared database)
- NextAuth.js (Credentials provider, JWT sessions, bcrypt)
- framer-motion (in-page micro-interactions only)
- lucide-react (icons)
- Radix UI primitives (dialog, dropdown menu, tabs)
- zod + react-hook-form + @hookform/resolvers (validation)
- clsx + tailwind-merge + class-variance-authority (styling utilities)
