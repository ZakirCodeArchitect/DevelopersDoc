"use client";

import type { ProcessedProject, ProcessedYourDoc } from '@/lib/docs';
import { useMemo } from 'react';
import { useCreateProject } from './CreateProjectHandler';
import { useCreateDoc } from './CreateDocHandler';

interface DocsLandingPageProps {
  processedProjects: ProcessedProject[];
  processedYourDocs: ProcessedYourDoc[];
}

export function DocsLandingPage({
  processedProjects,
  processedYourDocs,
}: DocsLandingPageProps) {
  const { handleCreateProject, CreateProjectModal } = useCreateProject();
  const { handleCreateDoc, CreateDocModal } = useCreateDoc();

  // Get all documents (for quick access)
  const allDocuments = useMemo(() => {
    const docs: Array<{
      id: string;
      title: string;
      href: string;
      firstPageHref?: string;
      description?: string;
      lastUpdated: string;
      pageCount: number;
      projectTitle?: string;
      isProjectDoc: boolean;
    }> = [];

    // Add project documents
    processedProjects.forEach((project) => {
      project.documents.forEach((doc) => {
        docs.push({
          id: doc.id,
          title: doc.title,
          href: doc.href,
          firstPageHref: doc.pages.length > 0 ? doc.pages[0].href : undefined,
          description: doc.description,
          lastUpdated: doc.lastUpdated,
          pageCount: doc.pages.length,
          projectTitle: project.title,
          isProjectDoc: true,
        });
      });
    });

    // Add your docs
    processedYourDocs.forEach((doc) => {
      docs.push({
        id: doc.id,
        title: doc.title,
        href: doc.href,
        firstPageHref: doc.pages.length > 0 ? doc.pages[0].href : undefined,
        description: doc.description,
        lastUpdated: doc.lastUpdated,
        pageCount: doc.pages.length,
        isProjectDoc: false,
      });
    });

    // Sort by lastUpdated (most recent first)
    return docs.sort((a, b) => {
      const dateA = new Date(a.lastUpdated).getTime();
      const dateB = new Date(b.lastUpdated).getTime();
      return dateB - dateA;
    });
  }, [processedProjects, processedYourDocs]);

  // Sort projects by lastUpdated (most recent first)
  const sortedProjects = useMemo(() => {
    return [...processedProjects].sort((a, b) => {
      const dateA = new Date(a.lastUpdated).getTime();
      const dateB = new Date(b.lastUpdated).getTime();
      return dateB - dateA;
    });
  }, [processedProjects]);

  const hasContent = processedProjects.length > 0 || processedYourDocs.length > 0;

  return (
    <div className="flex flex-1 w-full min-h-[calc(100vh-4rem)]">
      <div className="flex-1 max-w-6xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Developers Doc
          </h1>
          <p className="text-lg text-gray-600">
            Your documentation hub. Continue where you left off or explore your projects and documents.
          </p>
        </div>

        {!hasContent ? (
          /* Empty State */
          <div className="text-center py-16 px-4 bg-gray-50 border border-gray-200 rounded-lg">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No documents yet
            </h2>
            <p className="text-gray-600 mb-6">
              Get started by creating your first project or document.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleCreateProject}
                className="px-6 py-3 bg-[#CC561E] hover:bg-[#B84A17] text-white rounded-md transition-colors font-medium shadow-sm hover:shadow-md"
              >
                Create Project
              </button>
              <button
                onClick={() => handleCreateDoc()}
                className="px-6 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md transition-colors font-medium shadow-sm hover:shadow-md"
              >
                Create Document
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Quick Access to Projects */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
                <button
                  onClick={handleCreateProject}
                  className="flex items-center gap-2 px-4 py-2 bg-[#CC561E] hover:bg-[#B84A17] text-white rounded-md transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                  aria-label="Create new project"
                  title="Create new project"
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
                  Create Project
                </button>
              </div>
              {sortedProjects.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {sortedProjects.map((project) => (
                    <a
                      key={project.href}
                      href={project.href}
                      className="group block p-6 bg-white border border-gray-200 rounded-lg hover:border-[#CC561E] hover:shadow-md transition-all duration-200"
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#CC561E] transition-colors mb-1" style={{ textDecoration: 'none' }}>
                            {project.title}
                          </h3>
                          {project.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                          )}
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-[#CC561E] transition-colors flex-shrink-0 ml-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          Updated {project.lastUpdated}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
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
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          {project.documents.length} {project.documents.length === 1 ? 'document' : 'documents'}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <svg
                    className="w-12 h-12 text-gray-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <p className="text-gray-500 text-sm mb-2">No projects yet.</p>
                  <p className="text-gray-400 text-xs">Click "Create Project" to create your first project.</p>
                </div>
              )}
            </div>

            {/* Your Documents Section */}
            <div id="your-documents" className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Documents</h2>
                <button
                  onClick={() => handleCreateDoc()}
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
                  Create Document
                </button>
              </div>
              {allDocuments.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {allDocuments.map((doc) => (
                    <a
                      key={doc.href}
                      href={doc.firstPageHref || doc.href}
                      className="group block p-6 bg-white border border-gray-200 rounded-lg hover:border-[#CC561E] hover:shadow-md transition-all duration-200"
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#CC561E] transition-colors mb-1" style={{ textDecoration: 'none' }}>
                            {doc.title}
                          </h3>
                          {doc.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{doc.description}</p>
                          )}
                          {doc.projectTitle && (
                            <p className="text-xs text-gray-500 mt-1">
                              Project: {doc.projectTitle}
                            </p>
                          )}
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-[#CC561E] transition-colors flex-shrink-0 ml-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          Updated {doc.lastUpdated}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
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
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-500">No documents available.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <CreateProjectModal />
      <CreateDocModal />
    </div>
  );
}

