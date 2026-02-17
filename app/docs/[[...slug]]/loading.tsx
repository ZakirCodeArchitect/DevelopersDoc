import { DocsLoadingSkeleton } from '@/components/docs/DocsLoadingSkeleton';

/**
 * Shown while the docs page (RSC payload) is loading (e.g. full load or slow network).
 * Client-side navigation between docs uses the same skeleton via NavigationContext.
 */
export default function DocsLoading() {
  return <DocsLoadingSkeleton />;
}
