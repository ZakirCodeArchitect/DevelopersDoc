"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CreateDocModal } from './CreateDocModal';

export function useCreateDoc() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateDoc = useCallback((projectId?: string, projectName?: string) => {
    setProjectId(projectId || null);
    setProjectName(projectName || null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (!isLoading) {
      setIsModalOpen(false);
      setProjectId(null);
      setProjectName(null);
    }
  }, [isLoading]);

  const handleSubmit = useCallback(async (name: string, description: string) => {
    setIsLoading(true);
    
    try {
      // Call API to create the document (with or without projectId)
      const response = await fetch('/api/docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name, 
          description,
          projectId: projectId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create document');
      }

      // Close modal immediately before navigation
      setIsModalOpen(false);
      setProjectId(null);
      setProjectName(null);
      
      // Navigate to the new document page
      router.push(data.href);
      
      // Refresh the page to show the new document in the sidebar
      router.refresh();
    } catch (error) {
      console.error('Error creating document:', error);
      alert(error instanceof Error ? error.message : 'Failed to create document');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

  const Modal = () => (
    <CreateDocModal
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      onSubmit={handleSubmit}
      projectName={projectName || undefined}
    />
  );

  return {
    handleCreateDoc,
    CreateDocModal: Modal,
  };
}

