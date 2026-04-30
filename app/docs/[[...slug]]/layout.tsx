import { Suspense } from 'react';
import { getAuthenticatedClerkUserId } from '@/lib/users';
import { DocsLayoutWithNav } from './DocsLayoutWithNav';
import { DocsRouteLoading } from './DocsRouteLoading';
import { redirect } from 'next/navigation';

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkUserId = await getAuthenticatedClerkUserId();
  if (!clerkUserId) {
    redirect('/sign-in');
  }

  return (
    <Suspense fallback={<DocsRouteLoading />}>
      <DocsLayoutWithNav>{children}</DocsLayoutWithNav>
    </Suspense>
  );
}
