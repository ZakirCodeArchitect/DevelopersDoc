"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CreateDocModal } from './CreateDocModal';

export function useCreateDoc() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  // CRITICAL: Store form values here so they persist even if modal remounts
  const [storedFormValues, setStoredFormValues] = useState<{ name: string; description: string } | null>(null);
  const router = useRouter();

  const handleCreateDoc = useCallback((projectId?: string, projectName?: string) => {
    setProjectId(projectId || null);
    setProjectName(projectName || null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (!isLoading) {
      console.log('[CreateDocHandler DEBUG] 🔴 HANDLER: Closing modal', {
        stage: 'HANDLER_CLOSING_MODAL',
        isLoading,
        isModalOpen: true
      });
      setIsModalOpen(false);
      setProjectId(null);
      setProjectName(null);
    }
  }, [isLoading]);

  const handleSubmit = useCallback(async (name: string, description: string) => {
    console.log('[CreateDocHandler DEBUG] 🟡 HANDLER: Starting submission', {
      stage: 'HANDLER_STARTING_SUBMISSION',
      name,
      description,
      isLoading: false,
      willSetLoading: true
    });
    
    // CRITICAL: Store form values in handler state before setting loading
    // This ensures they persist even if modal component remounts
    setStoredFormValues({ name, description });
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

      // Keep modal open with loading state while navigating
      // Navigate to the new document page
      router.push(data.href);
      
      // Small delay to ensure form values stay visible during navigation
      setTimeout(() => {
        console.log('[CreateDocHandler DEBUG] 🔴 HANDLER: Closing modal after success', {
          stage: 'HANDLER_CLOSING_AFTER_SUCCESS',
          isLoading: true,
          willClose: true
        });
        setIsLoading(false);
        setIsModalOpen(false);
        setProjectId(null);
        setProjectName(null);
        setStoredFormValues(null); // Clear stored values after closing
        
        // Refresh the page to show the new document in the sidebar
        router.refresh();
      }, 100);
    } catch (error) {
      console.error('[CreateDocHandler] Error creating document:', error);
      alert(error instanceof Error ? error.message : 'Failed to create document');
      setIsLoading(false);
    }
  }, [projectId, router]);

  // CRITICAL: Use stable key to ensure React treats it as same component instance
  // Pass stored form values as prop so modal can restore them if needed
  const Modal = useCallback(() => (
    <CreateDocModal
      key="create-doc-modal" // Stable key - prevents remounting
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      onSubmit={handleSubmit}
      projectName={projectName || undefined}
      isSubmitting={isLoading}
      storedFormValues={storedFormValues} // Pass stored values to restore if lost
    />
  ), [isModalOpen, handleCloseModal, handleSubmit, projectName, isLoading, storedFormValues]);

  return {
    handleCreateDoc,
    CreateDocModal: Modal,
  };
}

