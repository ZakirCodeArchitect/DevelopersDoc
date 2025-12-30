# Client Bundle Size Optimizations

## Current State Analysis

### ✅ Already Optimized
1. **DocEditor is dynamically imported** - Good! It's only loaded when needed
   ```typescript
   const DocEditor = dynamic(() => import('./DocEditor'), { ssr: false });
   ```

### ⚠️ Issues Found

1. **Heavy TipTap Extensions Loaded Eagerly**
   - All 20+ TipTap extensions are imported at the top of `DocEditor.tsx`
   - Even though editor is dynamically imported, all extensions load together
   - **Impact:** ~200-300KB of JS for TipTap + extensions

2. **highlight.js / lowlight Loading All Languages**
   - Currently using `createLowlight()` which may load all languages
   - **Impact:** Can add 500KB+ if all languages are included

3. **Multiple Client Components**
   - Many components marked `"use client"` that might not need to be
   - Some could be Server Components with client islands

## Optimization Plan

### 1. Lazy Load TipTap Extensions (High Impact)

**Current:**
```typescript
// All loaded at once
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
// ... 20+ more imports
```

**Optimized:**
```typescript
// Load only when editor is created
const loadExtensions = async () => {
  const [
    StarterKit,
    Placeholder,
    Link,
    // ... load dynamically
  ] = await Promise.all([
    import("@tiptap/starter-kit"),
    import("@tiptap/extension-placeholder"),
    import("@tiptap/extension-link"),
    // ...
  ]);
  
  return [
    StarterKit.default,
    Placeholder.default,
    Link.default,
    // ...
  ];
};
```

**Impact:** Reduces initial bundle by ~150-200KB

### 2. Load Only Needed highlight.js Languages (High Impact)

**Current:**
```typescript
import { createLowlight } from "lowlight";
const lowlight = createLowlight(); // May load all languages
```

**Optimized:**
```typescript
import { createLowlight } from "lowlight";
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
// Only import languages you actually use

const lowlight = createLowlight({
  javascript,
  typescript,
  json,
  bash,
  // ... only what you need
});
```

**Impact:** Reduces bundle by 300-500KB (if all languages were loaded)

### 3. Convert Non-Interactive Components to Server Components

**Candidates for Server Components:**
- `DocContent` - Just renders HTML, no interactivity
- `CodeBlock` - Static code display (unless you have copy buttons)
- `DocTableOfContents` - Static navigation (unless interactive)

**Example:**
```typescript
// Before: "use client"
export function DocContent({ content }: { content: string }) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

// After: Server Component (remove "use client")
export function DocContent({ content }: { content: string }) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
```

**Impact:** Reduces client bundle by 50-100KB

### 4. Code Split Modal Components

**Current:** All modals loaded even when not visible

**Optimized:**
```typescript
// Lazy load modals
const ShareModal = dynamic(() => import('./ShareModal'), { 
  ssr: false 
});
const PublishModal = dynamic(() => import('./PublishModal'), { 
  ssr: false 
});
```

**Impact:** Reduces initial bundle by 20-30KB

### 5. Remove Unused Dependencies

Check if all TipTap extensions are actually used:
- Are you using `CharacterCount`? (might be removable)
- Are you using `TaskList`/`TaskItem`? (if not, remove)
- Are you using `Subscript`/`Superscript`? (if not, remove)

**Impact:** 10-50KB per unused extension

## Implementation Priority

### High Priority (Do First)
1. ✅ Load only needed highlight.js languages
2. ✅ Lazy load TipTap extensions
3. ✅ Convert static components to Server Components

### Medium Priority
4. Code split modal components
5. Remove unused TipTap extensions

### Low Priority (Nice to Have)
6. Further code splitting of editor features
7. Tree-shake unused code

## Expected Results

| Optimization | Bundle Size Reduction | Load Time Improvement |
|-------------|----------------------|----------------------|
| highlight.js languages | 300-500KB | 0.5-1s |
| Lazy TipTap extensions | 150-200KB | 0.3-0.5s |
| Server Components | 50-100KB | 0.1-0.2s |
| Code split modals | 20-30KB | 0.1s |
| **Total** | **520-830KB** | **1-1.8s faster** |

## How to Measure

1. **Build Analysis:**
   ```bash
   npm run build
   # Check .next/analyze or use @next/bundle-analyzer
   ```

2. **Network Tab:**
   - Check JS chunk sizes on route change
   - Look for large files (>100KB)
   - Check if TipTap/editor code loads on initial page

3. **Lighthouse:**
   - Run Lighthouse audit
   - Check "Reduce JavaScript execution time"
   - Look at "Unused JavaScript" warnings

## Quick Wins (5 minutes each)

1. **Limit highlight.js languages** - Biggest impact, easiest fix
2. **Remove unused TipTap extensions** - Quick check, easy removal
3. **Convert DocContent to Server Component** - Simple change

These three alone could save 400-600KB and 1-1.5 seconds!

