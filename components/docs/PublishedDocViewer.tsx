"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocContent } from './DocContent';
import { CodeBlock } from './CodeBlock';
import { InteractiveButton } from './InteractiveButton';

interface PublishedDocument {
  id: string;
  title: string;
  description: string | null;
  publishSlug: string;
  publishedAt: string;
  lastUpdated: string;
  author: {
    id: string;
    name: string;
    email: string;
    imageUrl: string | null;
  };
  pages: Array<{
    id: string;
    title: string;
    pageNumber: number;
    sections: Array<{
      id: string;
      title: string;
      type: string;
      content: string[];
      componentType: string | null;
    }>;
  }>;
}

interface PublishedDocViewerProps {
  slug: string;
}

export function PublishedDocViewer({ slug }: PublishedDocViewerProps) {
  const [document, setDocument] = useState<PublishedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchDocument();
  }, [slug]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/published/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setDocument(data);
      } else {
        console.error('Failed to fetch published document');
        router.push('/published');
      }
    } catch (error) {
      console.error('Error fetching published document:', error);
      router.push('/published');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC561E]"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document || document.pages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Document not found</p>
          <Link
            href="/published"
            className="text-[#CC561E] hover:underline"
          >
            Back to Published Docs
          </Link>
        </div>
      </div>
    );
  }

  const currentPage = document.pages[currentPageIndex];

  const renderSection = (section: {
    id: string;
    title: string;
    type: string;
    content: string[];
    componentType: string | null;
  }) => {
    if (section.type === 'html' && Array.isArray(section.content)) {
      return (
        <div
          key={section.id}
          dangerouslySetInnerHTML={{ __html: section.content.join('') }}
        />
      );
    } else if (section.type === 'text' && Array.isArray(section.content)) {
      return (
        <div key={section.id}>
          {section.content.map((paragraph, idx) => (
            <p key={idx} className="mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      );
    } else if (section.type === 'component' && section.componentType === 'code') {
      const codeContent = Array.isArray(section.content) ? section.content.join('\n') : '';
      return <CodeBlock key={section.id} code={codeContent} language="javascript" />;
    } else if (section.type === 'component' && section.componentType === 'button') {
      const buttonText = Array.isArray(section.content) ? section.content[0] || 'Click me' : 'Click me';
      return <InteractiveButton key={section.id} text={buttonText} />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/published"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{document.title}</h1>
                {document.description && (
                  <p className="text-sm text-gray-600 mt-1">{document.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {document.author.imageUrl ? (
                  <img
                    src={document.author.imageUrl}
                    alt={document.author.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm text-gray-600">
                      {document.author.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm text-gray-600">{document.author.name}</span>
              </div>
              <Link
                href="/docs"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                My Docs
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Page Navigation */}
      {document.pages.length > 1 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-8 py-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {document.pages.map((page, index) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPageIndex(index)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    index === currentPageIndex
                      ? 'bg-[#CC561E] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {page.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document Content */}
      <DocContent
        title={currentPage.title}
        lastUpdated={document.lastUpdated}
        fullWidth={false}
        previous={
          currentPageIndex > 0
            ? {
                label: document.pages[currentPageIndex - 1].title,
                href: `#page-${currentPageIndex - 1}`,
              }
            : undefined
        }
        next={
          currentPageIndex < document.pages.length - 1
            ? {
                label: document.pages[currentPageIndex + 1].title,
                href: `#page-${currentPageIndex + 1}`,
              }
            : undefined
        }
      >
        {currentPage.sections.map((section) => {
          if (section.title) {
            return (
              <div key={section.id} className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
                {renderSection(section)}
              </div>
            );
          }
          return renderSection(section);
        })}
      </DocContent>
    </div>
  );
}

