# Performance Monitoring Guide

## Quick Diagnosis Steps

### 1. Check Build Output (Bundle Sizes)
```bash
npm run build
# Look for chunk sizes in the output
# Check if editor bundle is actually smaller
```

### 2. Add Performance Logging

Add timing logs to identify slow operations:

```typescript
// In app/docs/[[...slug]]/page.tsx
const startTime = performance.now();
const data = await getAllDocsNavDataCached(user.id);
console.log(`[PERF] getAllDocsNavData: ${performance.now() - startTime}ms`);

const startTime2 = performance.now();
const publishedDocsData = await getAllPublishedDocsNavCached();
console.log(`[PERF] getAllPublishedDocsNav: ${performance.now() - startTime2}ms`);
```

### 3. Check Network Tab
- Open DevTools → Network
- Filter by "Fetch/XHR"
- Look for slow requests (>1s)
- Check which requests are blocking

### 4. Check Database Queries
Enable Prisma query logging:
```typescript
// In lib/db.ts
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? [{ emit: 'event', level: 'query' }]
    : ['error'],
});

// In development, log slow queries
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: any) => {
    if (e.duration > 100) { // Log queries > 100ms
      console.log(`[DB SLOW] ${e.duration}ms: ${e.query}`);
    }
  });
}
```

### 5. Check if Dynamic Imports Are Causing Issues

The dynamic imports might be causing delays. Check:
- Are modals loading slowly when opened?
- Is the editor taking longer to appear?

### 6. Revert Changes to Test

If needed, we can revert the bundle optimizations to see if they're the cause.

