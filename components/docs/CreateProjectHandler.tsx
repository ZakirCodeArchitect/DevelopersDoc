"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CreateProjectModal } from './CreateProjectModal';

export function useCreateProject() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

      // Close modal immediately before navigation
      setIsModalOpen(false);
      
      // Navigate to the new project page
      router.push(data.href);
      
      // Refresh the page to show the new project in the sidebar
      router.refresh();
    } catch (error) {
      console.error('Error creating project:', error);
      alert(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const Modal = () => (
    <CreateProjectModal
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      onSubmit={handleSubmit}
    />
  );

  return {
    handleCreateProject,
    CreateProjectModal: Modal,
  };
}
