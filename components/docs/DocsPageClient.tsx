"use client";

import { useMemo } from 'react';
import { DocLayout } from './DocLayout';
import { CodeBlock } from './CodeBlock';
import { InteractiveButton } from './InteractiveButton';
import type { NavItem } from './DocSidebar';
import type { TocItem } from './DocTableOfContents';
import type { NavLink } from './DocNavigation';
import type { ProcessedDocument, ProcessedProject, ProcessedYourDoc, ProcessedPage, DocumentSection } from '@/lib/docs';
import { isProject, isPage } from '@/lib/docs';
import { useCreateProject } from './CreateProjectHandler';
import { useCreateDoc } from './CreateDocHandler';
import { useRenameDelete } from './useRenameDelete';
import { ShareModal } from './ShareModal';
import { useState } from 'react';

interface DocsPageClientProps {
  sidebarItems: NavItem[];
  currentPath: string;
  currentPage: ProcessedDocument | ProcessedProject | ProcessedYourDoc | null;
  processedProjects: ProcessedProject[];
  processedYourDocs: ProcessedYourDoc[];
}

export function DocsPageClient({
  sidebarItems,
  currentPath,
  currentPage,
  processedProjects,
  processedYourDocs,
}: DocsPageClientProps) {
  const { handleCreateProject, CreateProjectModal } = useCreateProject();
  const { handleCreateDoc, CreateDocModal } = useCreateDoc();
  const {
    handleRenameProject,
    handleRenameDoc,
    handleDeleteProject,
    handleDeleteDoc,
    RenameModal: RenameModalComponent,
    DeleteModal: DeleteModalComponent,
  } = useRenameDelete();

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareType, setShareType] = useState<'document' | 'project'>('project');
  const [shareItemId, setShareItemId] = useState<string>('');
  const [shareItemName, setShareItemName] = useState<string>('');

  const handleShare = (type: 'document' | 'project', itemId: string, itemName: string) => {
    setShareType(type);
    setShareItemId(itemId);
    setShareItemName(itemName);
    setShareModalOpen(true);
  };

  // If page not found, show 404
  if (!currentPage) {
    return (
      <>
        <DocLayout
          sidebarItems={sidebarItems}
          currentPath={currentPath}
          title="Page Not Found"
          onCreateProject={handleCreateProject}
          onCreateDoc={handleCreateDoc}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
          onRenameDoc={handleRenameDoc}
          onDeleteDoc={handleDeleteDoc}
        >
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
            <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
            <a
              href="/docs"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Go to Documentation Home
            </a>
          </div>
        </DocLayout>
        <CreateProjectModal />
        <CreateDocModal />
        <RenameModalComponent />
        <DeleteModalComponent />
      </>
    );
  }

  // If current page is a project, show project overview with document list
  if (isProject(currentPage)) {
    return (
      <>
        <DocLayout
          sidebarItems={sidebarItems}
          currentPath={currentPath}
          title={currentPage.title}
          lastUpdated={currentPage.lastUpdated}
          tocItems={[]}
          previous={currentPage.navigation.previous || undefined}
          next={currentPage.navigation.next || undefined}
          onCreateProject={handleCreateProject}
          onCreateDoc={handleCreateDoc}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
          onRenameDoc={handleRenameDoc}
          onDeleteDoc={handleDeleteDoc}
        >
          {/* Project Description */}
          {currentPage.description && (
            <div className="mb-8">
              <p className="text-gray-700 text-lg">{currentPage.description}</p>
            </div>
          )}

          {/* List of Documents */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShare('project', currentPage.id, currentPage.title)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                  aria-label="Share project"
                  title="Share project"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share
                </button>
                <button
                  onClick={() => {
                    // Get project ID from currentPage (which is a ProcessedProject)
                    handleCreateDoc(currentPage.id, currentPage.title);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#CC561E] hover:bg-[#B84A17] text-white rounded-md transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                  aria-label="Create new document"
                  title="Create new document"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Document
                </button>
              </div>
            </div>
            {currentPage.documents && currentPage.documents.length > 0 ? (
              <ul className="space-y-2">
                {currentPage.documents.map((doc) => (
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
            ) : (
              <p className="text-gray-500 text-sm">No documents yet. Click "Add Document" to create one.</p>
            )}
          </div>
        </DocLayout>
        <CreateProjectModal />
        <CreateDocModal />
        <RenameModalComponent />
        <DeleteModalComponent />
      </>
    );
  }

  // Handle a page view (this app redirects document hrefs to first page),
  // but keep a safe fallback for direct document objects.
  const page: ProcessedPage | null = isPage(currentPage)
    ? (currentPage as ProcessedPage)
    : ('pages' in (currentPage as any) && (currentPage as any).pages?.length
        ? ((currentPage as any).pages[0] as ProcessedPage)
        : null);

  const tocItems: TocItem[] = page?.toc ?? [];
  const codeBlocks: any[] = []; // Code blocks are not part of the processed document types in DB mode

  // Navigation is handled at the page level in the new DB-backed flow.
  // Keep these undefined here to avoid incorrect type assumptions.
  const previous: NavLink | undefined = page?.navigation?.previous ?? undefined;
  const next: NavLink | undefined = page?.navigation?.next ?? undefined;

  return (
    <>
      <DocLayout
        sidebarItems={sidebarItems}
        currentPath={currentPath}
        title={(page as any)?.title ?? ''}
        lastUpdated={(currentPage as any)?.lastUpdated ?? ''}
        tocItems={tocItems}
        previous={previous}
        next={next}
        onCreateProject={handleCreateProject}
        onCreateDoc={handleCreateDoc}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        onRenameDoc={handleRenameDoc}
        onDeleteDoc={handleDeleteDoc}
      >
        {/* Render code blocks */}
        {codeBlocks.map((codeBlock, idx) => (
          <CodeBlock
            key={idx}
            filename={codeBlock.filename}
            language={codeBlock.language}
            code={codeBlock.code}
            highlightedLines={codeBlock.highlightedLines}
          />
        ))}

        {/* Render sections */}
        {(page?.sections ?? []).map((section: DocumentSection) => (
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
      <CreateProjectModal />
      <CreateDocModal />
      <RenameModalComponent />
      <DeleteModalComponent />
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        type={shareType}
        itemId={shareItemId}
        itemName={shareItemName}
      />
    </>
  );
}

