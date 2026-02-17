# Database performance: latency and round-trips

This doc summarizes how the app uses the DB and what was done to keep **latency** and **number of round-trips** as low as possible.

---

## 1. Indexes (schema)

Indexes added or confirmed so that hot paths use indexes and avoid full table scans:

| Table     | Index / key           | Used by |
|----------|------------------------|--------|
| **Project**  | `@@index([userId])`       | `getAllProjectsNav` (list projects by user) |
| **User**     | `@@index([email])`        | `getUserByEmail` (share flow, lookups) |
| **Document** | `@@index([userId, projectId])` | Nav and “your docs” filters |
| **Page**     | `@@index([documentId, pageNumber])` | Pages by doc, ordering |
| **Section**  | `@@index([pageId])`       | Sections by page (content load) |
| **Share**    | `@@index([sharedWith, status, documentId])`, `@@index([sharedWith, status, projectId])`, plus document/project + role | Share lookups by user and doc/project |

**Action:** After changing the schema, run:

```bash
npx prisma db push
# or
npx prisma migrate dev --name add_perf_indexes
```

---

## 2. Round-trip reduction

### Nav (layout + page)

- **getAllDocsNavData** runs **4 queries in parallel** (no extra sequential round-trips):
  - `getAllProjectsNav(userId)` → 1 query
  - `getAllYourDocsNav(userId)` → 1 query  
  - `getSharedProjects(userId)` → 1 query
  - `getSharedDocuments(userId)` → 1 query
- Result is cached with **unstable_cache** (30s) and key includes `userId` so nav is reused across requests.

### Page content (single doc page)

- **getPageWithSectionsUncached** (and thus **getPageWithSectionsCached**):
  - **Before:** 1 (page + document + sections) + 1 (document again in `checkDocumentAccess`) + 0–3 (shares/project) = **2–5 round-trips**.
  - **After:** Page query includes `document.projectId`. **checkDocumentAccess** accepts this document and skips the extra **document findUnique**. So: 1 (page + document + sections) + 0–3 (only share/project when not owner) = **1–4 round-trips** (one fewer in all cases).
- **getPageWithSectionsCached** wraps the above in **unstable_cache** (60s, tag `page`, `page-${pageId}`), so repeat views of the same page do **0 DB round-trips** until revalidate.

### Auth

- **getCurrentUser** is wrapped in React **cache()** so layout + page (and other callers in the same request) share a single DB round-trip.

---

## 3. Connection and latency (ops/infra)

- **Pooler:** Use Supabase **pooler** URL (`DATABASE_URL`) in the app so connections are pooled and you avoid per-request connection cost.
- **Region:** Deploy the app (e.g. Vercel) in the **same region** as the Supabase project. Each round-trip can drop from ~100–250 ms to single-digit ms once in the same region.
- **Prisma:** One shared **PrismaClient** per process (e.g. `globalThis` in dev) to avoid opening too many connections.

---

## 4. Per-request round-trip summary (cold cache)

| Request type        | Round-trips (approx.) |
|---------------------|------------------------|
| Docs layout only    | 1 (getCurrentUser) + 4 (nav, parallel) = **5** (then cached) |
| Docs page (content) | 1 (user, deduped) + 1–4 (page + access) = **2–5** (then page cached) |
| With warm cache     | 0–1 (cache hits for nav + page content) |

---

## 5. Revalidation after writes

When content or structure changes, revalidate so the next read is fresh and still fast:

- After **publish/unpublish:** `revalidateTag('published-nav-data')`
- After **create/rename/delete project or doc:** `revalidateTag('nav-data')`
- After **editing a page:** `revalidateTag('page')` or `revalidateTag(\`page-${pageId}\`)`

Example in an API route after saving a page:

```ts
import { revalidateTag } from 'next/cache';
// after prisma.page.update(...) or sections update
revalidateTag('page');
revalidateTag(`page-${pageId}`);
```

---

## 6. Already in place

- **Nav:** Only project/document/page metadata for sidebar (no section bodies); shared data in one query each via Prisma `include`/`select`.
- **Share:** Single query per “shared projects” and “shared documents” with nested `select`.
- **checkDocumentAccess:** Uses `select` for minimal columns and runs share/project lookups in **Promise.all** when needed.
- **Slow query log:** In development, queries over 100 ms are logged so you can spot regressions.
