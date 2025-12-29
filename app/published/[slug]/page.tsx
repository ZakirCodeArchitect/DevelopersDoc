import { redirect } from 'next/navigation';

interface PublishedDocPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PublishedDocPage({ params }: PublishedDocPageProps) {
  // Redirect old /published/[slug] routes to /docs/published/[slug] for consistency
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  redirect(`/docs/published/${slug}`);
}

