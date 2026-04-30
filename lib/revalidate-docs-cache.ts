import { revalidateTag } from 'next/cache';

/** Matches unstable_cache tags in lib/db.ts for sidebar + tree nav. */
export function revalidateDocsNavData() {
  revalidateTag('nav-data');
}

/** Published docs list in sidebar. */
export function revalidatePublishedNavData() {
  revalidateTag('published-nav-data');
}

/** Single page body cache (all users of that cache key — includes userId in key). */
export function revalidatePageCaches(pageId: string) {
  revalidateTag('page');
  revalidateTag(`page-${pageId}`);
}
