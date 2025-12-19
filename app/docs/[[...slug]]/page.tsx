import { DocLayout } from '@/components/docs';
import { CodeBlock } from '@/components/docs';
import { InteractiveButton } from '@/components/docs';
import type { NavItem, TocItem, NavLink } from '@/components/docs';

interface DocsPageProps {
  params: {
    slug?: string[];
  };
}

export default function DocsPage({ params }: DocsPageProps) {
  const slug = params.slug || [];
  const currentPath = slug.length > 0 ? `/docs/${slug.join('/')}` : '/docs';

  const sidebarItems: NavItem[] = [
    {
      label: 'Introduction',
      href: '/docs',
    },
    {
      label: 'Another Page',
      href: '/docs/another-page',
    },
    {
      label: 'Advanced (A Folder)',
      href: '/docs/advanced',
      children: [
        {
          label: 'Satori',
          href: '/docs/advanced/satori',
        },
      ],
    },
  ];

  // Determine page content based on path
  if (currentPath === '/docs/another-page') {
    const tocItems: TocItem[] = [
      {
        id: 'component',
        label: 'Component',
        level: 1,
      },
      {
        id: 'external-component',
        label: 'External Component',
        level: 1,
      },
    ];

    const previous: NavLink = {
      label: 'Introduction',
      href: '/docs',
    };

    const next: NavLink = {
      label: 'Advanced (A Folder)',
      href: '/docs/advanced',
    };

    return (
      <DocLayout
        sidebarItems={sidebarItems}
        currentPath={currentPath}
        title="Another Page"
        lastUpdated="December 4, 2022"
        tocItems={tocItems}
        previous={previous}
        next={next}
      >
        <CodeBlock
          filename="demo.js"
          language="javascript"
          code={`let a = 1;
console.log(a);`}
          highlightedLines={[2]}
        />

        <section id="component" className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Component
          </h2>
          <div className="mt-4">
            <InteractiveButton />
          </div>
        </section>

        <section id="external-component" className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            External Component
          </h2>
          <div className="mt-4">
            <InteractiveButton />
          </div>
        </section>
      </DocLayout>
    );
  }

  // Default introduction page
  const tocItems: TocItem[] = [
    {
      id: 'getting-started',
      label: 'Getting Started',
      level: 1,
    },
  ];

  const next: NavLink = {
    label: 'Another Page',
    href: '/docs/another-page',
  };

  return (
    <DocLayout
      sidebarItems={sidebarItems}
      currentPath={currentPath}
      title="Introduction"
      lastUpdated="December 4, 2022"
      tocItems={tocItems}
      next={next}
    >
      <section id="getting-started">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Getting Started
        </h2>
        <p className="text-gray-700 mb-4">
          Welcome to the Developers Documentation. This is a comprehensive guide
          to help you get started with our platform.
        </p>
        <p className="text-gray-700 mb-4">
          Use the navigation on the left to explore different sections of the
          documentation.
        </p>
      </section>
    </DocLayout>
  );
}

