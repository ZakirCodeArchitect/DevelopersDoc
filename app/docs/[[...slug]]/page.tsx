import { Suspense } from 'react';
import { DocsPageInner, type DocsPageInnerProps } from './DocsPageInner';
import { DocsContentSkeleton } from './DocsContentSkeleton';

export default function DocsPage(props: DocsPageInnerProps) {
  return (
    <Suspense fallback={<DocsContentSkeleton />}>
      <DocsPageInner {...props} />
    </Suspense>
  );
}
