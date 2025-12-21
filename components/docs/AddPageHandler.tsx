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
    }
  }, [isLoading]);

  const handleSubmit = useCallback(async (title: string, content: string) => {
    if (!docId) return;

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

      // Close modal
      setIsModalOpen(false);
      setDocId(null);
      setProjectId(undefined);
      setDocName(null);
      
      // Refresh the page to show the new section
      router.refresh();
      
      // Navigate to the new page after a brief delay
      setTimeout(() => {
        if (data.page?.id) {
          // The page will be shown after router.refresh()
          // We could navigate to the new page URL here if we have the full path
          router.refresh();
        }
      }, 100);
    } catch (error) {
      console.error('Error adding page:', error);
      alert(error instanceof Error ? error.message : 'Failed to add page');
    } finally {
      setIsLoading(false);
    }
  }, [docId, projectId, router]);

  const Modal = () => (
    <AddPageModal
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      onSubmit={handleSubmit}
      docName={docName || undefined}
    />
  );

  return {
    handleAddPage,
    AddPageModal: Modal,
  };
}

