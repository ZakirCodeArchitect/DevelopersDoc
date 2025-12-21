"use client";

import { useMemo } from 'react';
import { DocLayout } from './DocLayout';
import { CodeBlock } from './CodeBlock';
import { InteractiveButton } from './InteractiveButton';
import type { NavItem } from './DocSidebar';
import type { TocItem } from './DocTableOfContents';
import type { NavLink } from './DocNavigation';
import type { ProcessedDocument, ProcessedProject, ProcessedYourDoc } from '@/lib/docs';
import { isProject, isProjectDocument, getProjectDocumentNavigation } from '@/lib/docs';
import { useCreateProject } from './CreateProjectHandler';
import { useCreateDoc } from './CreateDocHandler';
import { useRenameDelete } from './useRenameDelete';

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

  // Handle document pages (both project documents and "Your Docs")
  const document = currentPage as ProcessedDocument | ProcessedYourDoc;
  const codeBlocks = document.content.codeBlocks || [];
  const tocItems: TocItem[] = document.toc;

  // Get navigation for project documents only
  let previous: NavLink | undefined;
  let next: NavLink | undefined;
  if (isProjectDocument(document, processedProjects)) {
    const nav = getProjectDocumentNavigation(document as ProcessedDocument, processedProjects);
    previous = nav.previous || undefined;
    next = nav.next || undefined;
  }

  return (
    <>
      <DocLayout
        sidebarItems={sidebarItems}
        currentPath={currentPath}
        title={document.title}
        lastUpdated={document.lastUpdated}
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
        {document.content.sections.map((section) => (
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
    </>
  );
}

