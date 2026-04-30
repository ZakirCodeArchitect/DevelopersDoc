import { getAuthenticatedClerkUserId } from '@/lib/users';
import { DocsLayoutWithNav } from './DocsLayoutWithNav';
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

  return <DocsLayoutWithNav>{children}</DocsLayoutWithNav>;
}
