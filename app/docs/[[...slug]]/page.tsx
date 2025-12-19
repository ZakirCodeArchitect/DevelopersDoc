import { DocLayout } from '@/components/docs';
import { CodeBlock } from '@/components/docs';
import { InteractiveButton } from '@/components/docs';
import type { NavItem, TocItem, NavLink } from '@/components/docs';
import docsData from '@/data/docs.json';

interface DocsPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export default async function DocsPage({ params }: DocsPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  const currentPath = slug.length > 0 ? `/docs/${slug.join('/')}` : '/docs';

  // Build sidebar items from JSON data with nested project documents
  const sidebarItems: NavItem[] = [
    {
      label: 'Projects',
      href: '#',
      children: docsData.navigation.projects.map((project: any) => ({
        label: project.label,
        href: project.href,
        children: project.documents?.map((doc: any) => ({
          label: doc.label,
          href: doc.href,
        })) || [],
      })),
    },
    {
      label: 'Your Docs',
      href: '#',
      children: docsData.navigation.yourDocs.map((doc) => ({
        label: doc.label,
        href: doc.href,
      })),
    },
  ];

  // Find the current page data - check projects, project documents, and your docs
  const allProjectDocs = docsData.navigation.projects.flatMap((project: any) => 
    project.documents || []
  );
  const allDocs = [...docsData.navigation.yourDocs, ...docsData.navigation.projects, ...allProjectDocs];
  const currentPage = allDocs.find((doc) => doc.href === currentPath);
  
  // Check if current path is a project page (not a project document)
  const currentProject = docsData.navigation.projects.find((p: any) => p.href === currentPath);

  // If page not found, default to introduction
  if (!currentPage) {
    const introPage = docsData.navigation.yourDocs.find((doc) => doc.id === 'introduction');
    if (!introPage) {
      return <div>Page not found</div>;
    }

    const tocItems: TocItem[] = introPage.toc || [];
    // Only show navigation for projects, not for "Your Docs"
    const isProject = docsData.navigation.projects.some((p: any) => p.href === currentPath);
    const nav = isProject ? (introPage as any).navigation || {} : {};

    return (
      <DocLayout
        sidebarItems={sidebarItems}
        currentPath={currentPath}
        title={introPage.title}
        lastUpdated={introPage.lastUpdated}
        tocItems={tocItems}
        previous={isProject ? (nav.previous || undefined) : undefined}
        next={isProject ? (nav.next || undefined) : undefined}
      >
      {introPage.content.sections.map((section: any) => (
        <section key={section.id} id={section.id} className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
          {section.type === 'text' && Array.isArray(section.content) && (
            <div>
              {section.content.map((paragraph: string, idx: number) => (
                <p key={idx} className="text-gray-700 mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </section>
      ))}
      </DocLayout>
    );
  }

  // If current page is a project (not a project document), show project overview with document list
  if (currentProject) {
    const nav = currentProject.navigation || {};
    const isProject = true;

    return (
      <DocLayout
        sidebarItems={sidebarItems}
        currentPath={currentPath}
        title={currentProject.title}
        lastUpdated={currentProject.lastUpdated}
        tocItems={[]}
        previous={isProject ? (nav.previous || undefined) : undefined}
        next={isProject ? (nav.next || undefined) : undefined}
      >
        {/* Project Description */}
        {currentProject.description && (
          <div className="mb-8">
            <p className="text-gray-700 text-lg">{currentProject.description}</p>
          </div>
        )}

        {/* List of Documents */}
        {currentProject.documents && currentProject.documents.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Documents</h2>
            <ul className="space-y-2">
              {currentProject.documents.map((doc: any) => (
                <li key={doc.id}>
                  <a
                    href={doc.href}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-lg"
                  >
                    {doc.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DocLayout>
    );
  }

  // Render code blocks if they exist
  const codeBlocks = (currentPage as any).content?.codeBlocks || [];
  const tocItems: TocItem[] = (currentPage as any).toc || [];
  // Only show navigation for project documents, not for "Your Docs"
  const isProjectDoc = allProjectDocs.some((p: any) => p.href === currentPath);
  const nav = isProjectDoc ? ((currentPage as any).navigation || {}) : {};

  return (
    <DocLayout
      sidebarItems={sidebarItems}
      currentPath={currentPath}
      title={currentPage.title}
      lastUpdated={(currentPage as any).lastUpdated}
      tocItems={tocItems}
      previous={isProjectDoc ? (nav.previous || undefined) : undefined}
      next={isProjectDoc ? (nav.next || undefined) : undefined}
    >
      {/* Render code blocks */}
      {codeBlocks.map((codeBlock: any, idx: number) => (
        <CodeBlock
          key={idx}
          filename={codeBlock.filename}
          language={codeBlock.language}
          code={codeBlock.code}
          highlightedLines={codeBlock.highlightedLines}
        />
      ))}

      {/* Render sections */}
      {currentPage.content.sections.map((section: any) => (
        <section key={section.id} id={section.id} className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
          {section.type === 'text' && Array.isArray(section.content) && (
            <div>
              {section.content.map((paragraph: string, idx: number) => (
                <p key={idx} className="text-gray-700 mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
          {section.type === 'component' && section.componentType === 'InteractiveButton' && (
            <div className="mt-4">
              <InteractiveButton />
            </div>
          )}
        </section>
      ))}
    </DocLayout>
  );
}

