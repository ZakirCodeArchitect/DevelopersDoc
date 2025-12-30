"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AddPageModal } from './AddPageModal';

export function useAddPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [docName, setDocName] = useState<string | null>(null);
  // CRITICAL: Store form values here so they persist even if modal remounts
  const [storedFormValues, setStoredFormValues] = useState<{ title: string; content: string } | null>(null);
  const router = useRouter();

  const handleAddPage = useCallback((docId: string, docName?: string, projectId?: string) => {
    setDocId(docId);
    setProjectId(projectId);
    setDocName(docName || null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (!isLoading) {
      setIsModalOpen(false);
      setDocId(null);
      setProjectId(undefined);
      setDocName(null);
      setStoredFormValues(null); // Clear stored values when closing
    }
  }, [isLoading]);

  const handleSubmit = useCallback(async (title: string, content: string) => {
    if (!docId) return;

    // CRITICAL: Store form values in handler state before setting loading
    // This ensures they persist even if modal component remounts
    setStoredFormValues({ title, content });
    setIsLoading(true);
    
    try {
      // Call API to add a section to the document
      const response = await fetch(`/api/docs/${docId}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title,
          content: content || undefined,
          projectId: projectId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add page');
      }

      // Generate the URL for the new page
      let newPageUrl: string | null = null;
      if (data.page?.id) {
        if (projectId) {
          // Project document: /docs/projects/{projectId}/{docId}/{pageId}
          newPageUrl = `/docs/projects/${projectId}/${docId}/${data.page.id}`;
        } else {
          // Your Docs document: /docs/{docId}/{pageId}
          newPageUrl = `/docs/${docId}/${data.page.id}`;
        }
      }

      // Navigate to the new page
      if (newPageUrl) {
        // Use window.location for a full page navigation to ensure fresh data is loaded
        // This ensures the route handler fetches the newly created page
        // Small delay to ensure database transaction is committed and form values stay visible
        setTimeout(() => {
          window.location.href = newPageUrl!;
        }, 100);
      } else {
        // Fallback: close modal and refresh if no URL
        setIsLoading(false);
        setIsModalOpen(false);
        setDocId(null);
        setProjectId(undefined);
        setDocName(null);
        setStoredFormValues(null);
        router.refresh();
      }
    } catch (error) {
      console.error('[AddPageHandler] Error adding page:', error);
      alert(error instanceof Error ? error.message : 'Failed to add page');
      setIsLoading(false);
    }
  }, [docId, projectId, router]);

  // CRITICAL: Use stable key to ensure React treats it as same component instance
  // Pass stored form values as prop so modal can restore them if needed
  const Modal = useCallback(() => (
    <AddPageModal
      key="add-page-modal" // Stable key - prevents remounting
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      onSubmit={handleSubmit}
      docName={docName || undefined}
      isSubmitting={isLoading}
      storedFormValues={storedFormValues} // Pass stored values to restore if lost
    />
  ), [isModalOpen, handleCloseModal, handleSubmit, docName, isLoading, storedFormValues]);

  return {
    handleAddPage,
    AddPageModal: Modal,
  };
}

