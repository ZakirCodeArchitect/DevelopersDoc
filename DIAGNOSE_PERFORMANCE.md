# Performance Diagnosis Guide

## What I Just Added

I've added performance monitoring that will log:
1. **Database query times** - Shows queries taking >100ms
2. **Navigation data fetch times** - Shows how long `getAllDocsNavData` and `getAllPublishedDocsNav` take
3. **Modal load times** - Shows when modals are dynamically loaded
4. **Total timing** - Shows overall operation times

## How to Use

### 1. Check Browser Console
Open DevTools → Console and look for:
- `[PERF]` - Performance timing logs
- `[DB SLOW]` - Slow database queries (>100ms)

### 2. Check Network Tab
- Open DevTools → Network
- Filter by "Fetch/XHR" or "JS"
- Look for:
  - **Slow RSC requests** (docs?_rsc=...) - Should be <2s
  - **Large JS chunks** - Check if editor bundle is actually smaller
  - **Blocking requests** - Red bars in waterfall

### 3. Identify the Culprit

**If you see:**
- `[DB SLOW]` logs → Database is the bottleneck
- `[PERF] getAllDocsNavData: 2000ms+` → Navigation query is slow
- Large JS chunks in Network tab → Bundle optimization didn't work
- Slow modal loads → Dynamic imports might be causing issues

## Quick Test: Revert Bundle Optimizations

If the bundle optimizations are causing issues, we can revert them:

### Option 1: Revert highlight.js optimization
```typescript
// In components/docs/DocEditor.tsx
// Change back to:
const lowlight = createLowlight(); // Loads all languages
```

### Option 2: Revert modal code-splitting
```typescript
// In components/docs/DocsPageContent.tsx
// Change back to:
import { ShareModal } from './ShareModal';
import { PublishModal } from './PublishModal';
```

## What to Look For

### Database Issues
- Look for `[DB SLOW]` in console
- Check if queries are sequential instead of parallel
- Verify indexes are being used

### Bundle Issues
- Check Network tab → JS files
- Look for large chunks (>500KB)
- See if editor loads on initial page (it shouldn't)

### Network Issues
- Check if database is remote (Supabase)
- Look for high latency in Network tab
- Check if using pooled connection

## Next Steps Based on Findings

1. **If database is slow:**
   - Check connection pooling
   - Verify indexes are applied
   - Consider adding more caching

2. **If bundle is large:**
   - Check if highlight.js optimization worked
   - Verify dynamic imports are working
   - Consider removing unused dependencies

3. **If network is slow:**
   - Check database region vs deployment region
   - Consider edge functions
   - Check connection pooling settings

## Share the Results

After running the app, share:
1. Console logs with `[PERF]` and `[DB SLOW]`
2. Network tab screenshot showing request times
3. Which operations are slow

This will help identify the exact bottleneck!

