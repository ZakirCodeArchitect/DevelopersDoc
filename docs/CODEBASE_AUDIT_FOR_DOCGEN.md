# Codebase audit for documentation generation (DevelopersDoc)

**Generated:** 2026-05-06  
**Repository:** DevelopersDoc (developers-doc)  
**Purpose:** Safe, shareable snapshot of the **actual** codebase, environment shape (no secret values), API surface, data model, and how that compares to **CLI-driven generated documentation** and **scanner/generator** capabilities.

**Security:** This document lists environment variable **names** and **non-secret status classifications** only. No `.env` values, tokens, URLs, or credentials are included.

---

## 1. Executive Summary

**What this repository appears to be**

- **Product purpose:** A **hosted documentation platform** (“Developers Doc”) where users sign in (Clerk), organize **projects** and **documents**, edit rich-text pages (Tiptap), **share** access by email, **publish** documents under public slugs, and optionally **link a local git repository** via the **`developerdoc` CLI** to upload **scan metadata** (stack, routes, env usage, Prisma snapshot, module map). The server stores scans in **`DocSyncSnapshot`** and can create a **single auto-generated document** per project (`GENERATED_DOC_TITLE` in `lib/sync/doc-generation.service.ts`).

- **Main runtime surfaces**
  - **Next.js App Router** UI: marketing home (`app/page.tsx`), authenticated docs app under `app/docs/[[...slug]]/`, sign-in/up, CLI link helper (`app/cli/link/page.tsx`), published docs under `app/docs/...` (see `DocsPageInner` / published routes).
  - **HTTP API:** `app/api/**/route.ts` (REST-style handlers).
  - **CLI:** `packages/developerdoc-cli` (bin `developerdoc`) — `init`, `scan`, talks to `/api/cli/*`.

- **Core modules**
  - **`lib/db.ts`** — Prisma data access, nav/page caching, document CRUD.
  - **`lib/sync/*`** — CLI token hashing, snapshots/changes, CLI auth sessions, **`generateInitialDocumentationForSyncProject`**, **`buildGeneratedPagesV2`** (HTML page plan from metadata v2).
  - **`lib/users.ts`**, **`lib/shares.ts`**, **`lib/publish.ts`**, **`lib/email.ts`** — user sync from Clerk, sharing, publish validation, SMTP.
  - **`proxy.ts`** — Clerk **`clerkMiddleware`** with route matchers (public vs protected); **not** named `middleware.ts` (see §7).

- **Database usage:** **PostgreSQL** via **Prisma** (`prisma/schema.prisma`). **`DATABASE_URL`** (pooled) and **`DIRECT_URL`** (direct) in datasource block.

- **Auth usage:** **Clerk** (`@clerk/nextjs`) for web sessions; **`auth()`** / **`currentUser()`** in server code; **Svix-verified** Clerk **webhook** at `app/api/webhooks/clerk/route.ts`. **CLI sync** uses **hashed sync tokens** on `DocSyncProject`, plus **device-code OAuth-style** flow in `CliAuthSession` / `lib/sync/cli-auth.service.ts`.

- **CLI usage:** `developerdoc init` (browser auth or manual project id) writes `.developerdoc/config.json`; `developerdoc scan` runs `scanMetadata` and **POST**s to **`/api/cli/scan`**.

- **Documentation generation flow:** Scan → **`storeInitialScan`** (`DocSyncSnapshot`) → **`generateInitialDocumentationForSyncProject`** (if no existing generated doc) → transactional **`Document` + `Page` + `Section` + `DocAISuggestion`** → nav revalidation. **V2** rich pages when snapshot `metadata.metadataVersion === 2` and **`DEVELOPERDOC_DOC_GEN_V2 !== 'false'`** (`lib/sync/generated-doc-pages-v2.ts`).

---

## 2. Actual Tech Stack

| Item | Detected value | Evidence | Confidence |
|------|----------------|----------|------------|
| Framework | Next.js (App Router) | `package.json` (`next@16.1.0`), `app/` tree, `vercel.json` | **High** |
| Language | TypeScript | `tsconfig`, `.ts`/`.tsx` sources | **High** |
| Package manager | **npm** (lockfile present) | `package-lock.json`, `packages/developerdoc-cli/package-lock.json` | **High** |
| Database | PostgreSQL | `prisma/schema.prisma` `provider = "postgresql"` | **High** |
| ORM | Prisma | `@prisma/client`, `prisma/schema.prisma` | **High** |
| Auth provider | Clerk | `@clerk/nextjs`, `ClerkProvider` in `app/layout.tsx`, `proxy.ts`, `app/api/webhooks/clerk/route.ts` | **High** |
| Email provider | Nodemailer (SMTP) | `nodemailer` in `package.json`, `lib/email.ts` (`EMAIL_USER` / `EMAIL_PASS`) | **High** |
| Editor library | Tiptap + ProseMirror + lowlight | `package.json` `@tiptap/*`, `highlight.js`, `app/api/docs/[id]/pages/[pageId]/route.ts` | **High** |
| Styling | Tailwind CSS v4 | `@tailwindcss/postcss`, `tailwindcss@4`, `app/globals.css` | **High** |
| Deployment target | Vercel (primary) | `vercel.json`, README deploy section, `@vercel/speed-insights` | **High** |
| CI/CD | GitHub Actions | `.github/workflows/ci-cd.yml` | **High** |
| Testing tools | Node built-in test runner via **tsx** (CLI package only) | `packages/developerdoc-cli/package.json` `"test": "tsx --test src/**/*.test.ts"`; **no root test script** | **Medium** |
| Build tools | `next build --webpack`, TypeScript, ESLint | `package.json`, `next.config.ts` | **High** |

---

## 3. Actual Package Scripts

### Root (`package.json`)

| Script | Command |
|--------|---------|
| `dev` | `next dev --webpack` |
| `build` | `next build --webpack \|\| true` |
| `start` | `next start` |
| `lint` | `eslint` |
| `postinstall` | `prisma generate` |
| `db:generate` | `prisma generate` |
| `db:push` | `prisma db push` |
| `db:migrate` | `prisma migrate dev` |
| `db:studio` | `prisma studio` |

**Notes:** Root has **no** `test` script. **`build` always exits 0** due to `\|\| true`, which can hide build failures. **No** dedicated docgen/scanner scripts in root (CLI is separate package).

### CLI (`packages/developerdoc-cli/package.json`)

| Script | Command |
|--------|---------|
| `build` | `tsc -p tsconfig.json` |
| `dev` | `tsx src/index.ts` |
| `test` | `tsx --test src/**/*.test.ts` |

---

## 4. Actual Environment Variables

**Inspection method:** `.env` was inspected locally; only **keys** and **empty vs non-empty** were recorded. **No values appear in this report.**

### 4.1 Redacted name classification (pattern-based)

| Variable (pattern) | Classification |
|--------------------|----------------|
| `DATABASE_URL`, `DIRECT_URL` | `database_like` |
| `CLERK_SECRET_KEY`, `WEBHOOK_SECRET`, `EMAIL_PASS` | `secret_like` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `public_key_like` (intended for browser) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_*_REDIRECT_URL` | `url_like` |
| `NEXT_PUBLIC_APP_URL` | `url_like` |
| `EMAIL_USER` | `email_like` |
| `DEBUG_PRISMA_QUERIES`, `DEBUG_API_SAVE`, `DEVELOPERDOC_DOC_GEN_V2` | `feature_flag_like` |
| `NAV_CACHE_SECONDS`, `PAGE_CACHE_SECONDS` | `cache_like` |

### 4.2 Master table (safe)

| Variable | Exists in `.env` | Value status | Scope | Likely purpose | Files referencing (examples) | Required locally? | Safe notes |
|----------|------------------|--------------|-------|----------------|------------------------------|-------------------|------------|
| `DATABASE_URL` | yes | `present_non_empty` | server-only | Prisma pooled DB URL | `prisma/schema.prisma`, CI workflow | **yes** | Required by Prisma datasource |
| `DIRECT_URL` | yes | `present_non_empty` | server-only | Prisma migrations / direct connection | `prisma/schema.prisma`, CI workflow | **yes** | Comment in schema: migrations and CLI |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | `present_non_empty` | public | Clerk browser SDK | (implicit via `@clerk/nextjs`) | **yes** | Expected to be public; CI checks this secret |
| `CLERK_SECRET_KEY` | yes | `present_non_empty` | server-only | Clerk server / API | (implicit via `@clerk/nextjs`) | **yes** | Server secret; CI build |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | yes | `present_non_empty` | public | Clerk sign-in path config | (implicit Clerk env convention) | **likely** | Public route configuration |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | yes | `present_non_empty` | public | Post sign-in redirect | (implicit) | **likely** | |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | yes | `present_non_empty` | public | Post sign-up redirect | (implicit) | **likely** | |
| `WEBHOOK_SECRET` | yes | `present_non_empty` | server-only | Svix / Clerk webhook verification | `app/api/webhooks/clerk/route.ts` | **yes** (prod) | Without it webhook handler throws |
| `EMAIL_USER` | yes | `present_non_empty` | server-only | SMTP auth user | `lib/email.ts` | **likely** if sending mail | |
| `EMAIL_PASS` | yes | `present_non_empty` | server-only | SMTP password | `lib/email.ts` | **likely** if sending mail | Treat as secret |
| `NEXT_PUBLIC_APP_URL` | yes | `present_non_empty` | public | Absolute URLs for emails / CLI auth base | `app/api/cli/auth/start/route.ts`, share routes | **likely** | Used to build links; share routes also reference `VERCEL_URL` |
| `VERCEL_URL` | no | `missing` (platform may inject) | server-only | Vercel deployment host | `app/api/projects/[id]/share/route.ts`, `app/api/documents/[id]/share/route.ts` | **unknown** | Often set by Vercel at runtime |
| `NODE_ENV` | no | `referenced_only` | unknown | Runtime mode | `lib/db.ts`, `app/docs/.../DocsPageInner.tsx`, `lib/users.ts` | **no** | Standard Node |
| `DEBUG_PRISMA_QUERIES` | no | `missing_from_env_but_referenced` | server-only | Verbose Prisma logging | `lib/db.ts` | **no** | Opt-in debug |
| `NAV_CACHE_SECONDS` | no | `missing_from_env_but_referenced` | server-only | Nav cache TTL | `lib/db.ts` | **no** | Optional tuning |
| `PAGE_CACHE_SECONDS` | no | `missing_from_env_but_referenced` | server-only | Page cache TTL | `lib/db.ts` | **no** | Optional tuning |
| `DEBUG_API_SAVE` | no | `missing_from_env_but_referenced` | server-only | API save debug logs | `app/api/docs/[id]/pages/[pageId]/route.ts` | **no** | Set to `1` to enable |
| `DEVELOPERDOC_DOC_GEN_V2` | no | `missing_from_env_but_referenced` | server-only | Disable V2 doc builder if `false` | `lib/sync/generated-doc-pages-v2.ts` | **no** | Defaults to V2 enabled |

### 4.3 Cross-checks

- **In `.env` but not referenced as string literals in TS:** Clerk **`NEXT_PUBLIC_*`** / **`CLERK_SECRET_KEY`** — still **required at runtime** by Clerk; treat as **implicit framework consumption**.
- **Referenced in code but not in `.env`:** `VERCEL_URL`, `DEBUG_*`, `*_CACHE_SECONDS`, `DEVELOPERDOC_DOC_GEN_V2` — optional or platform-provided.
- **`NEXT_PUBLIC_*` generally safe:** Clerk publishable key and redirect URLs are **meant** for the client; still avoid putting **secrets** in `NEXT_PUBLIC_*` (scanner warns on naming in metadata v2).
- **`NEXT_PUBLIC_*` worth scrutiny:** Any future key that is not actually public — **naming** is the risk, not these specific Clerk keys.
- **Local setup minimum (typical):** `DATABASE_URL`, `DIRECT_URL`, Clerk keys, `NEXT_PUBLIC_APP_URL`, `WEBHOOK_SECRET` for webhook parity; email vars if testing invitations.

**No `.env.example` file** was found in the repo (confidence **high**).

---

## 5. Actual Prisma Schema and Database Model Analysis

**Datasource:** `provider = "postgresql"`; **`url = env("DATABASE_URL")`**, **`directUrl = env("DIRECT_URL")`**.  
**Generator:** `prisma-client-js`.  
**Migrations folder:** **Not present** in `prisma/migrations` at audit time — **no** migration history checked in (teams may use `db push` or generate migrations elsewhere).  
**Model count:** **12**  
**Enum count:** **0** (string fields used for roles/status instead)

### Per-model summary

| Model | Business meaning | Key fields | Relations (plain English) | Cascade / null | Indexes / constraints | Used by (representative) |
|-------|------------------|------------|----------------------------|----------------|----------------------|---------------------------|
| **User** | App user mirrored from Clerk | `clerkId` unique, `email` | Owns projects & docs; CLI auth sessions; targeted by shares | User delete cascades to owned projects/docs (see below) | `clerkId` unique, index on `email` | `lib/users.ts`, most API routes via `getCurrentUser` |
| **Project** | Workspace / folder for docs | `title`, `label`, `userId` | Many documents; shares; sync binding `DocSyncProject`; AI suggestions | Delete project **cascades** to documents (schema) | `userId` index | `app/api/projects/*`, sync services |
| **Document** | Doc container (project or “Your Docs”) | `projectId` optional, `userId` | Pages; shares; optional `PublishedDocument` | Cascade from project/user as defined | Composite index `userId, projectId` | Docs API, publish, share |
| **Page** | Page within document | `pageNumber`, `documentId` | Many sections | Cascade when document deleted | `documentId, pageNumber` | Editor save API, readers |
| **Section** | HTML/text blocks | `type`, `content` string array | Belongs to page | Cascade when page deleted | `pageId` index | Generated docs + editor |
| **Share** | Invite / ACL by email | `role` viewer/editor, `status` pending/accepted | Links to project **or** document; optional `sharedWith` user | `sharedWith` user **SetNull** on delete; project/document **Cascade** | Several composite indexes for lookups | Share APIs, `lib/shares.ts` |
| **PublishedDocument** | Public slug mapping | `publishSlug` unique | One-to-one with `Document` | Cascade if document deleted | `documentId` unique, `publishSlug` unique | Publish API, public fetch APIs |
| **CliAuthSession** | Device flow for CLI login | `deviceCodeHash`, `userCode`, `status`, token hashes | Optional `User` | User delete **SetNull** on session | Status/expiry indexes | `app/api/cli/auth/*`, `cli-auth.service` |
| **DocSyncProject** | Linked repo per project | `syncTokenHash`, `repoName`, `metadata` JSON | One project, one user; many snapshots/changes | Cascade from project | `projectId` unique | CLI register/scan, sync status |
| **DocSyncSnapshot** | Immutable scan payload | `commitSha`, `metadata` JSON | Belongs to sync project | Cascade | `syncProjectId, createdAt` | `storeInitialScan`, doc generation |
| **DocSyncChange** | Incremental file change record | `changedFiles` JSON, commits | Belongs to sync project | Cascade | `syncProjectId`, `status` | `app/api/cli/changes`, sync service |
| **DocAISuggestion** | AI / generation audit row | `suggestionType`, `payload` | Links project, optional doc/page, optional `sourceSnapshotId` | Document/page **SetNull** | Indexes on project/status | Initial doc generation creates `initial_docs_generation` |

**Operational note:** `docs/DATABASE_PERFORMANCE.md` documents intentional indexes and caching — valuable for “actual behavior” vs generated docs.

---

## 6. Actual API Route Inventory

**Scope:** Only `app/**/route.ts` files. **No** `pages/api`. **19** route files (some export multiple methods).

### 6.1 Route table

| Method(s) | Route | File | Purpose | Auth type | DB models touched | Operations (illustrative) | Env vars | Response codes | Side effects | Notes |
|-----------|-------|------|---------|-----------|-------------------|---------------------------|----------|----------------|--------------|-------|
| POST | `/api/docs` | `app/api/docs/route.ts` | Create document | Clerk session | Document, Page, Section?, Project? | `createDocument` | — | 401, 400, 500, 200 | creates doc + nav revalidate | Requires name/description |
| PATCH, DELETE | `/api/docs/[id]` | `app/api/docs/[id]/route.ts` | Rename / delete document | Clerk | Document | `updateDocument`, `deleteDocument` | — | 401,400,500,200 | revalidate paths | Ownership checks in db layer |
| POST | `/api/docs/[id]/sections` | `app/api/docs/[id]/sections/route.ts` | Add page | Clerk | Page, Section, Document | `addPageToDocument` | — | 401,400,500,200 | nav revalidate | |
| PATCH | `/api/docs/[id]/pages/[pageId]` | `app/api/docs/[id]/pages/[pageId]/route.ts` | Save Tiptap JSON → HTML sections | Clerk | Page, Section | `updatePage` | `DEBUG_API_SAVE` | 401,400,500,200 | page + nav cache revalidate | Large conversion logic in-route |
| POST | `/api/projects` | `app/api/projects/route.ts` | Create project | Clerk | Project | `createProject` | — | 401,400,500,200 | nav revalidate | |
| PATCH, DELETE | `/api/projects/[id]` | `app/api/projects/[id]/route.ts` | Rename / delete project | Clerk | Project (+ cascades) | `updateProject`, `deleteProject` | — | 401,400,500,200 | nav revalidate | Delete cascades docs |
| POST, GET, DELETE | `/api/projects/[id]/share` | `app/api/projects/[id]/share/route.ts` | Invite / list / remove project shares | Clerk | Share, Project, User | `shareProject`, `getProjectShares`, `removeShare` | `NEXT_PUBLIC_APP_URL`, `VERCEL_URL` | 401,403,404,500,200 | **may send email** | Complex permission model |
| GET, POST, DELETE | `/api/documents/[id]/publish` | `app/api/documents/[id]/publish/route.ts` | Publish status / publish / unpublish | Clerk | Document, PublishedDocument | find, upsert, delete publish row | — | 401,404,400,500,200 | revalidate published + nav | Owner-only |
| POST, GET, DELETE | `/api/documents/[id]/share` | `app/api/documents/[id]/share/route.ts` | Document share CRUD | Clerk | Share, Document, User, Project | share helpers + prisma | `NEXT_PUBLIC_APP_URL`, `VERCEL_URL` | 401,403,404,500,200 | **may send email** | Fine-grained editor rules |
| GET | `/api/published` | `app/api/published/route.ts` | List published docs (paginated) | **Public** (middleware bypass) | PublishedDocument, Document, User | findMany, count | — | 500, 200 | none | **Comment in file says “requires authentication” but implementation has no `getCurrentUser`** — doc/comment mismatch |
| GET | `/api/published/[slug]` | `app/api/published/[slug]/route.ts` | Fetch one published doc by slug | **Public** | PublishedDocument → Document → Pages → Sections | findUnique | — | 404,500,200 | none | Exposes author email in JSON |
| POST | `/api/webhooks/clerk` | `app/api/webhooks/clerk/route.ts` | Sync Clerk users | **Webhook secret** (Svix) | User | upsert/delete via `syncUserFromClerk` | `WEBHOOK_SECRET` | 400,500,200 | DB user sync | Throws if secret missing |
| POST | `/api/cli/register` | `app/api/cli/register/route.ts` | Register sync for owned project | Clerk | DocSyncProject | `createSyncProject` | — | 401,403,400,500,200 | returns plaintext **sync token once** | Owner-only |
| POST | `/api/cli/register-from-auth` | `app/api/cli/register-from-auth/route.ts` | Register after CLI browser auth | **CLI auth token** (one-time) | Project, DocSyncProject | create project if needed, `createSyncProject` | — | 400,401,500,200 | nav revalidate | Creates project by title match |
| POST | `/api/cli/scan` | `app/api/cli/scan/route.ts` | Accept scan metadata | **CLI sync bearer / body token** | DocSyncSnapshot, DocSyncProject | `validateSyncToken`, `storeInitialScan`, triggers doc gen | — | 400,401,503,500,200 | snapshot + optional **generated doc** | Rejects obvious secrets in payload |
| POST | `/api/cli/changes` | `app/api/cli/changes/route.ts` | Record file change set | **CLI sync token** | DocSyncChange, DocSyncProject | `storeSyncChange` | — | 400,401,500,200 | updates last commit on project | Secret pattern filter |
| GET | `/api/cli/project-status` | `app/api/cli/project-status/route.ts` | Dashboard sync status | Clerk | DocSyncProject, DocSyncChange, DocAISuggestion, Document | read helpers | — | 401,403,400,500,200 | none | |
| POST | `/api/cli/auth/start` | `app/api/cli/auth/start/route.ts` | Start device login | **Public** | CliAuthSession | `startCliAuthSession` | `NEXT_PUBLIC_APP_URL` | 500,200 | creates session | |
| POST | `/api/cli/auth/poll` | `app/api/cli/auth/poll/route.ts` | Poll device approval | **Public** | CliAuthSession | `pollCliAuthSession` | — | 400,404,410,409,200 | may return `cliAuthToken` | |
| POST | `/api/cli/auth/confirm` | `app/api/cli/auth/confirm/route.ts` | Approve with user code | Clerk | CliAuthSession | `approveCliAuthSession` | — | 401,400,404,410,409,500,200 | marks session approved | |

### 6.2 Buckets

- **DB writes:** `POST/PATCH/DELETE` on docs, projects, shares, publish, CLI scan/changes/register*, webhooks, auth start/poll/confirm (session rows).
- **No obvious session auth in handler (by design):** `/api/webhooks/clerk` (uses Svix), `/api/published`, `/api/published/[slug]`, `/api/cli/*` (token/device flows). **Note:** `/api/published` is a **data exposure** surface — intentionally public per `proxy.ts`.
- **External side effects:** Share routes → **email**; webhook → **Clerk** verification only; no third-party doc hosting.
- **Should be documented better:** `/api/published*` public behavior; **`proxy.ts` matcher** vs “protected app”; **regeneration rules** for generated docs; **build `|| true`**.

---

## 7. Actual Auth and Authorization Flow

### 7.1 Web user authentication

- **Provider:** **Clerk** (`ClerkProvider` in `app/layout.tsx`).
- **Session resolution:** `auth()` / `currentUser()` (`lib/users.ts`); **`getCurrentUser`** uses React **`cache()`** for per-request deduplication.
- **Edge / middleware:** Implemented in **`proxy.ts`** (not `middleware.ts`) using **`clerkMiddleware`** and **`createRouteMatcher`**.
  - **Public routes:** `/`, `/sign-in`, `/sign-up` (HTML).
  - **Public API prefixes:** `/api/webhooks`, `/api/published`, `/api/cli` — **skip** `auth.protect()`.
  - **Matcher:** `/docs/:path*`, `/cli/:path*`, `/api/:path*` — marketing **`/`** is **not** in matcher (no middleware auth on home).
- **Protected patterns:** Under `/docs/...` and `/cli/...` (except public API rules above), unauthenticated users hit **`auth.protect()`**.
- **Ownership:** Enforced in **`lib/db.ts`** helpers and share/publish routes (owner, editor, viewer rules).

### 7.2 CLI sync authentication

- **Registration:** Either **Clerk session** (`/api/cli/register`) or **CLI auth token** after device flow (`/api/cli/register-from-auth`).
- **Scan / changes:** **`Authorization: Bearer <syncToken>`** or body `syncToken` + `syncProjectId`; validated by **`validateSyncToken`** (SHA-256 compare).
- **Device auth:** `CliAuthSession` rows; poll returns short-lived **`cliAuthToken`** consumed by **`consumeCliAuthToken`**.

### 7.3 Webhook authentication

- **Clerk → app:** **`WEBHOOK_SECRET`** with **Svix** signature headers (`svix-id`, `svix-timestamp`, `svix-signature`). Rejects unsigned requests.

### 7.4 Share / publish access

- **Share:** Email-based invites; `Share` rows; accepted when user signs up / email matches (`acceptPendingShares` in user sync). Editors vs viewers enforced in API.
- **Publish:** **`PublishedDocument`** slug; public read via **`/api/published/[slug]`** and docs UI for published paths (see `DocsPageInner`).
- **Gaps / unclear:** **`/api/published` list** exposes author **email** — confirm product intent; **comment vs code** on auth for list endpoint.

---

## 8. Actual Core Runtime Flows

### 8.1 CLI init / link flow

1. **Entry:** `packages/developerdoc-cli/src/commands/init.ts` → `runInitCommand`.
2. **Config:** `.developerdoc/config.json` via `writeConfig` (`apiUrl`, `projectId`, `syncProjectId`, `syncToken`, `privacyMode`); `.gitignore` updated for config path.
3. **Auth path:** `startCliAuth` → **`POST /api/cli/auth/start`** → browser `verificationUrl` → user approves on **`POST /api/cli/auth/confirm`** (Clerk session) → CLI **`POST /api/cli/auth/poll`** until `cliAuthToken`.
4. **Register:** **`POST /api/cli/register-from-auth`** with token → may **`project.create`** → **`createSyncProject`**.
5. **Manual path:** prompts for `projectId` → **`POST /api/cli/register`** (requires Clerk session in browser — API expects logged-in user; manual mode still uses that endpoint from CLI with user-supplied id).
6. **Failure cases:** invalid device code, expired session, cancelled prompts, HTTP errors mapped in `init.ts`.

### 8.2 CLI scan flow

1. **Entry:** `packages/developerdoc-cli/src/commands/scan.ts` → `runScanCommand`.
2. **Scanner:** `scanMetadata(cwd)` in `packages/developerdoc-cli/src/utils/scanner.ts` — reads `package.json`, globs files (limits: **`MAX_SCAN_FILES = 200`**, size cap), **semantic** analysis in `scanner-semantic.ts`, **`metadataVersion: 2`** payload.
3. **Secret protection:** Server **`hasObviousSecrets`** on `metadata` (`app/api/cli/scan/route.ts`); similar for **`changedFiles`** on changes route.
4. **API:** `sendScan` → **`POST /api/cli/scan`** with `syncProjectId`, token, `commitSha`, `metadata`.
5. **Persistence:** **`storeInitialScan`** → `DocSyncSnapshot.create` + project fields update.
6. **Doc generation:** **`generateInitialDocumentationForSyncProject(syncProjectId)`** — skipped if suggestion or doc already exists (see §11).

### 8.3 Initial documentation generation flow

1. **Service:** `generateInitialDocumentationForSyncProject` in `lib/sync/doc-generation.service.ts`.
2. **Snapshot:** Latest `DocSyncSnapshot` by `createdAt`.
3. **Idempotency:** Checks **`DocAISuggestion`** for same `sourceSnapshotId` and type **`initial_docs_generation`**; checks existing **`Document`** titled **`GENERATED_DOC_TITLE`**.
4. **Builder:** **`shouldUseBuildGeneratedPagesV2`** → **`buildGeneratedPagesV2`** else legacy **`buildGeneratedPages`**.
5. **Transaction:** `prisma.$transaction` with **extended timeout** (comments re P2028) — creates **Document**, **Pages**, **Sections**, **DocAISuggestion**, updates **`DocSyncProject.metadata`** flags.

### 8.4 Documentation rendering flow

1. **Route:** `app/docs/[[...slug]]/page.tsx` → **`DocsPageInner`** (client/server mix per file).
2. **Layout:** `app/docs/[[...slug]]/layout.tsx` — nav, sidebar.
3. **Content:** **`components/docs/DocsPageContent.tsx`** — Tiptap editor vs read mode; **`dangerouslySetInnerHTML`** for HTML sections.
4. **Sanitization:** Generated HTML from server uses **`escapeHtml`** in builders; user/editor HTML path relies on Tiptap conversion — **no separate DOMPurify** spotted in this audit (treat as area for security review if untrusted HTML is ever ingested).

### 8.5 Publish / share flow

- **Publish:** `app/api/documents/[id]/publish/route.ts` + **`lib/publish.ts`** validation; **`PublishedDocument`** upsert; revalidate published nav.
- **Public consumption:** `app/api/published/[slug]/route.ts`; UI under docs published segment (`DocsPageInner` published mode).
- **Share:** Project/document share APIs + **`lib/shares.ts`** + **`lib/email.ts`**.

---

## 9. Actual Frontend Architecture

- **App Router structure:** Root marketing **`app/page.tsx`**; **docs app** under **`app/docs/[[...slug]]/`** with nested dynamic segments for projects/docs/pages; **auth** routes `app/sign-in`, `app/sign-up`; **CLI helper** `app/cli/link/page.tsx`; **published** redirect `app/published/page.tsx` → `/docs/published`.
- **Major UI areas:** Marketing sections (`components/sections/*`); docs chrome + editor (`components/docs/*`, `DocsPageInner`).
- **Docs reader/editor:** Tiptap-based editing; **`DocsPageContent`**; navigation data from **`lib/db.ts`** cached getters.
- **Published docs:** **`PublishedDocViewer.tsx`** (HTML join + `dangerouslySetInnerHTML`).
- **Data fetching:** Server components + API routes from client for mutations; **`unstable_cache`** / **`revalidateTag`** patterns per `DATABASE_PERFORMANCE.md`.
- **Boundaries:** Explicit **`'use client'`** in editor-related components; server layouts load user + nav.

---

## 10. Actual Folder and Module Responsibilities

| Module | Responsibility | Important files | Depends on | Used by | Notes |
|--------|----------------|-----------------|------------|---------|-------|
| `app` | Routes, layouts, marketing | `app/layout.tsx`, `app/page.tsx`, `app/docs/**`, `app/cli/link/page.tsx` | Clerk, components, lib | Browser | `proxy.ts` is root-level, not under `app/` |
| `app/api` | REST handlers | All `app/api/**/route.ts` | lib/db, sync, users, shares | Frontend, CLI, webhooks | Public CLI + published subsets |
| `app/docs` | Docs SPA | `[[...slug]]/page.tsx`, `DocsPageInner.tsx`, `layout.tsx` | lib/db, components | Authenticated users | Published + private routes |
| `components` | UI building blocks | `components/docs/*`, `components/sections/*` | React, Tiptap | `app/*` | |
| `lib` | Domain logic | `db.ts`, `users.ts`, `shares.ts`, `publish.ts`, `email.ts` | Prisma, Clerk | API + server components | Large `db.ts` |
| `lib/sync` | CLI sync + docgen | `sync.service.ts`, `cli-auth.service.ts`, `doc-generation.service.ts`, `generated-doc-pages-v2.ts` | Prisma | CLI API routes | V1/V2 generation split |
| `prisma` | Schema | `schema.prisma` | PostgreSQL | All persistence | No migrations dir in repo |
| `packages/developerdoc-cli` | Local tooling | `src/commands/init.ts`, `scan.ts`, `utils/scanner.ts` | fast-glob, git | Developers | Metadata v2 contract |
| `scripts` | One-off | `migrate-json-to-db.ts` | Prisma | Manual ops | |
| `docs` | Human-written docs | `DATABASE_PERFORMANCE.md`, this file | — | Team | Sparse vs code surface |

---

## 11. Actual Generated Documentation Pipeline

- **Scanner metadata:** **`ScanMetadata`** in `packages/developerdoc-cli/src/utils/scanner.ts` — **`metadataVersion: 2`** with **`apiRoutes`**, **`envUsage`**, **`moduleMap`**, **`prismaSchema`**, **`packageScripts`**, **`setupHints`**, **`filesByClassification`**, **`importantDocs`**, **`dependencyGraph`**, etc.
- **Snapshot storage:** JSON in **`DocSyncSnapshot.metadata`**; project-level JSON in **`DocSyncProject.metadata`** (includes flags like `initialDocsGenerated`).
- **buildGeneratedPagesV2:** **`lib/sync/generated-doc-pages-v2.ts`** — returns **12 pages**: Overview, Architecture, Local Setup, Folder & Module Structure, API Reference (table), Database & Data Model, Authentication & Authorization, Frontend Architecture, Key Runtime Flows, Deployment & Operations, Environment Variables, Maintenance/Risks.
- **V3:** **Not found** in codebase (no `buildGeneratedPagesV3`).
- **Fallback:** Legacy **`buildGeneratedPages`** in `doc-generation.service.ts` when V2 disabled or metadata not v2.
- **First-scan / regenerate:** **Single generated document per project** if title matches; **`generateInitialDocumentationForSyncProject` returns early** if doc or suggestion already exists — **subsequent scans do not auto-regenerate** that document (by design today). Comment in `scan` route: generation runs after **every** scan but service **no-ops** if already present.
- **Limitations:** Scanner file caps (**200 files**, 1MB/file); regex/semantic inference for HTTP methods; **no `middleware.ts` filename** in repo ( **`proxy.ts`** may be missed by scanners expecting `middleware.ts` ); Prisma **migrations folder** may be absent; generated HTML stored as sections — **Mermaid/diagrams** are text blocks, not executed in-app.

---

## 12. Comparison: Actual Codebase vs Current Generated Docs

*“Current generated docs” = output of **`buildGeneratedPagesV2`** / legacy builder from the **latest `DocSyncSnapshot`** when a linked project is scanned — content reflects **scanned repository**, not necessarily this audit’s narrative.*

| Area | Actual codebase contains | Current generated docs show | Gap | Suggested docgen improvement |
|------|-------------------------|----------------------------|-----|---------------------------|
| Project overview | Developers Doc: hosted editor + CLI sync product | Scanned repo dependencies, “what project appears to be” from **customer** `package.json` | Product vs scanned target confusion | Add **host-app mode** or README override for DeveloperDoc itself |
| Setup guide | Root README generic; real setup needs DB + Clerk + email | Inferred install/migrate from **scanned** `package.json` | Wrong repo if scanning downstream | Pin **importantDocs** to monorepo README / `docs/*.md` |
| Architecture | `proxy.ts`, `lib/sync`, Prisma, caches | ASCII/Mermaid from **scan** module map | **proxy.ts** naming vs middleware | Teach scanner **Next 16 `proxy.ts`** = middleware |
| API reference | 19 real route files; public vs auth nuanced | Table from **`apiRoutes`** (static analysis) | May miss methods / wrong auth flags | AST export detection; map **`proxy.ts` public prefixes** |
| Database models | 12 models, rich relations | Prisma snapshot from scanned `schema.prisma` | If scan is not this repo, schema differs | Ensure self-scan or multi-package schema merge |
| Auth flow | Clerk + `proxy.ts` matchers + CLI tokens | Generic Clerk paragraph + `usesAuth` heuristics | **Public `/api/published`** not distinguished | Encode “public API allowlist” pattern |
| Env vars | Many implicit Clerk vars | `envUsage` from `process.env.*` scan | Clerk vars often **not** in string literals | Merge with `.env` **names only** + known framework vars |
| Runtime flows | Concrete function names (`generateInitialDocumentationForSyncProject`) | High-level bullets | Missing **idempotent / no-regenerate** behavior | Document **single-shot generation** + recovery |
| Frontend architecture | Specific components (`DocsPageContent`) | Classification counts (`ui_page`, etc.) | Depth vs real component graph | Link top N components by import graph |
| Deployment | `vercel.json`, GitHub workflow, `build \|\| true` | Detected CI files list | **Build masking** not visible | Scanner flag risky scripts |
| Maintenance/risks | TS errors ignored, no migrations in repo | Metadata completeness risks | **Quality gates** absent | CI summary block in generated “Maintenance” page |

---

## 13. Scanner / Generator Improvement Recommendations

1. **Scanner:** Detect **`proxy.ts`** / `middleware.ts` for Next.js and classify as **edge auth**; parse **`createRouteMatcher`** public prefixes where feasible.
2. **Scanner:** Raise or annotate **`MAX_SCAN_FILES`** when hit; surface **“partial scan”** flag in metadata.
3. **Scanner:** Include **monorepo** / workspace packages if scanning DeveloperDoc + CLI together (or document separate scans).
4. **Generator:** Add explicit page for **“CLI + API contract”** (`/api/cli/scan` payload shape, auth headers, secret rejection rules).
5. **Generator:** Explain **regeneration policy** (when generated doc is skipped; how to force regen if ever added).
6. **Generator:** For this product, add **first-party** section: **Published docs security** (public JSON fields), **share email** behavior.
7. **Misleading docs to fix in product:** **`/api/published` GET** comment vs behavior; **`projects/[id]/share` baseUrl** ternary logic (verify intent).
8. **Quality checks:** Fail CI if **`next build`** fails (remove `\|\| true` or gate behind env); optional **`prisma migrate diff`** check when schema changes.
9. **Env docs:** Add **`.env.example`** with **names only** (no values) for onboarding.
10. **HTML safety:** Document whether **DOMPurify** (or similar) is required for future untrusted HTML sources.

---

## 14. Safe Appendix

### 14.1 Inspected files (representative)

- **Config / infra:** `package.json`, `packages/developerdoc-cli/package.json`, `package-lock.json`, `vercel.json`, `.github/workflows/ci-cd.yml`, `next.config.ts`, `proxy.ts`
- **Env:** `.env` (keys only, not reproduced here)
- **DB:** `prisma/schema.prisma`
- **API:** all `app/api/**/route.ts` listed in §6
- **Sync / docgen:** `lib/sync/sync.service.ts`, `lib/sync/doc-generation.service.ts`, `lib/sync/generated-doc-pages-v2.ts`, `lib/types/cli-scan-metadata.ts`
- **CLI:** `packages/developerdoc-cli/src/commands/init.ts`, `scan.ts`, `utils/scanner.ts` (partial), `utils/scanner-semantic.ts` (referenced)
- **Core lib:** `lib/db.ts` (referenced), `lib/users.ts`, `lib/email.ts`
- **UI:** `app/layout.tsx`, `app/docs/[[...slug]]/page.tsx`, `DocsPageInner.tsx` (referenced), `components/docs/DocsPageContent.tsx`, `components/docs/PublishedDocViewer.tsx`
- **Docs:** `README.md`, `docs/DATABASE_PERFORMANCE.md`

### 14.2 Counts

| Metric | Count |
|--------|-------|
| API route **files** (`app/**/route.ts`) | **19** |
| Distinct **HTTP handlers** (methods × routes) | **~35** (see §6 table) |
| UI `page.tsx` under `app/` | **7** |
| Prisma **models** | **12** |
| Prisma **enums** | **0** |
| Env vars in **master table** (§4.2) | **18** rows |
| Root **npm scripts** | **10** |
| CLI **npm scripts** | **3** |
| Markdown docs (existing before this report) | **2** (`README.md`, `docs/DATABASE_PERFORMANCE.md`) |

### 14.3 Skipped / limits

- **`node_modules/`, `.next/`, `dist/`, coverage** — excluded by policy and scanner ignores.
- **`lib/db.ts` full body** — not line-audited end-to-end; behavior summarized from usage and `DATABASE_PERFORMANCE.md`.
- **No secret values** from `.env` or CI logs were copied into this file.

---

*End of report.*
