"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CreateProjectModal } from './CreateProjectModal';

export function useCreateProject() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // CRITICAL: Store form values here so they persist even if modal remounts
  const [storedFormValues, setStoredFormValues] = useState<{ name: string; description: string } | null>(null);
  const router = useRouter();

  const handleCreateProject = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (!isLoading) {
      setIsModalOpen(false);
    }
  }, [isLoading]);

  const handleSubmit = useCallback(async (name: string, description: string) => {
    // CRITICAL: Store form values in handler state before setting loading
    // This ensures they persist even if modal component remounts
    setStoredFormValues({ name, description });
    setIsLoading(true);
    
    try {
      // Call API to create the project
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Wait a brief moment to show "Creating..." state, then close
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Close modal after showing creating state
      setIsModalOpen(false);
      setIsLoading(false);
      setStoredFormValues(null); // Clear stored values after closing
      
      // Navigate to the new project page
      router.push(data.href);
      
      // Refresh the page to show the new project in the sidebar
      router.refresh();
    } catch (error) {
      console.error('Error creating project:', error);
      alert(error instanceof Error ? error.message : 'Failed to create project');
      setIsLoading(false);
    }
  }, [router]);

  // CRITICAL: Use stable key to ensure React treats it as same component instance
  // Pass stored form values as prop so modal can restore them if needed
  const Modal = useCallback(() => (
    <CreateProjectModal
      key="create-project-modal" // Stable key - prevents remounting
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      storedFormValues={storedFormValues} // Pass stored values to restore if lost
    />
  ), [isModalOpen, handleCloseModal, handleSubmit, isLoading, storedFormValues]);

  return {
    handleCreateProject,
    CreateProjectModal: Modal,
  };
}
