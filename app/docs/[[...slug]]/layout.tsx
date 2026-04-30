import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/users';
import { DocsLayoutWithNav } from './DocsLayoutWithNav';
import { DocsRouteLoading } from './DocsRouteLoading';
import { redirect } from 'next/navigation';

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in');
  }

  return (
    <Suspense fallback={<DocsRouteLoading />}>
      <DocsLayoutWithNav userId={user.id}>{children}</DocsLayoutWithNav>
    </Suspense>
  );
}
