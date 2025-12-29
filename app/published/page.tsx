import { redirect } from 'next/navigation';

export default async function PublishedDocsPage() {
  // Redirect old /published route to /docs/published for consistency
  redirect('/docs/published');
}

