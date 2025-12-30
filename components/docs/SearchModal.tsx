"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ProcessedProject, ProcessedDocument, ProcessedYourDoc, ProcessedPage } from '@/lib/docs';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProcessedProject[];
  yourDocs: ProcessedYourDoc[];
}

type SearchResult = {
  id: string;
  title: string;
  href: string;
  type: 'project' | 'document' | 'page';
  description?: string;
  parentTitle?: string;
};

export function SearchModal({ isOpen, onClose, projects, yourDocs }: SearchModalProps) {
  const [activeTab, setActiveTab] = useState<'docs' | 'pages'>('docs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Build searchable items from projects and docs
  const allItems = useMemo(() => {
    const items: SearchResult[] = [];

    // Add projects
    projects.forEach((project) => {
      items.push({
        id: project.id,
        title: project.title,
        href: project.href,
        type: 'project',
        description: project.description,
      });

      // Add documents within projects
      project.documents.forEach((doc) => {
        items.push({
          id: doc.id,
          title: doc.title,
          href: doc.href,
          type: 'document',
          description: doc.description,
          parentTitle: project.title,
        });

        // Add pages within documents
        doc.pages.forEach((page) => {
          items.push({
            id: page.id,
            title: page.title,
            href: page.href,
            type: 'page',
            parentTitle: `${project.title} > ${doc.title}`,
          });
        });
      });
    });

    // Add your docs
    yourDocs.forEach((doc) => {
      items.push({
        id: doc.id,
        title: doc.title,
        href: doc.href,
        type: 'document',
        description: doc.description,
      });

      // Add pages within your docs
      doc.pages.forEach((page) => {
        items.push({
          id: page.id,
          title: page.title,
          href: page.href,
          type: 'page',
          parentTitle: doc.title,
        });
      });
    });

    return items;
  }, [projects, yourDocs]);

  // Filter results based on search query
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
      // If no search query, show all items
      return activeTab === 'pages' 
        ? allItems.filter(item => item.type === 'page')
        : allItems.filter(item => item.type !== 'page'); // Show docs and projects, not pages
    }

    const query = searchQuery.toLowerCase();
    const filtered = allItems.filter((item) => {
      const matchesTitle = item.title.toLowerCase().includes(query);
      const matchesDescription = item.description?.toLowerCase().includes(query);
      const matchesParent = item.parentTitle?.toLowerCase().includes(query);
      
      return matchesTitle || matchesDescription || matchesParent;
    });

    // Filter by tab
    if (activeTab === 'pages') {
      return filtered.filter(item => item.type === 'page');
    }

    // For 'docs' tab, show projects and documents, but not pages
    return filtered.filter(item => item.type !== 'page');
  }, [searchQuery, allItems, activeTab]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults, activeTab]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (e.key === 'Enter' && filteredResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredResults[selectedIndex]);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (item: SearchResult) => {
    router.push(item.href);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop - starts below header (header is h-16 = 4rem) */}
      <div className="fixed inset-0 top-16 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('docs');
              setSelectedIndex(0);
            }}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'docs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Docs
          </button>
          <button
            onClick={() => {
              setActiveTab('pages');
              setSelectedIndex(0);
            }}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'pages'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pages
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="What are you searching for?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none text-base"
            />
            <button
              onClick={onClose}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded hover:border-gray-400 transition-colors"
            >
              Esc
            </button>
          </div>
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          className="max-h-96 overflow-y-auto"
        >
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? 'No results found' : 'Start typing to search...'}
            </div>
          ) : (
            <div className="py-2">
              {filteredResults.map((item, index) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                    index === selectedIndex ? 'bg-gray-50' : ''
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {/* Document Icon */}
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
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
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 font-medium truncate">{item.title}</div>
                    {item.parentTitle && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {item.parentTitle}
                      </div>
                    )}
                    {item.description && (
                      <div className="text-sm text-gray-600 truncate mt-1">
                        {item.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

