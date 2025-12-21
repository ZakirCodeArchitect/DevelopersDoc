"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RenameModal } from './RenameModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export function useRenameDelete() {
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    type: 'project' | 'document';
    id: string;
    currentName: string;
    projectId?: string;
  } | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'project' | 'document';
    id: string;
    name: string;
    projectId?: string;
  } | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleRenameProject = useCallback((projectId: string, currentName: string) => {
    setRenameModal({
      isOpen: true,
      type: 'project',
      id: projectId,
      currentName,
    });
  }, []);

  const handleRenameDoc = useCallback((docId: string, currentName: string, projectId?: string) => {
    setRenameModal({
      isOpen: true,
      type: 'document',
      id: docId,
      currentName,
      projectId,
    });
  }, []);

  const handleDeleteProject = useCallback((projectId: string, projectName: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'project',
      id: projectId,
      name: projectName,
    });
  }, []);

  const handleDeleteDoc = useCallback((docId: string, docName: string, projectId?: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'document',
      id: docId,
      name: docName,
      projectId,
    });
  }, []);

  const handleRenameSubmit = useCallback(async (newName: string) => {
    if (!renameModal) return;

    try {
      const endpoint = renameModal.type === 'project' 
        ? '/api/projects' 
        : '/api/docs';
      
      const response = await fetch(`${endpoint}/${renameModal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: newName,
          projectId: renameModal.projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to rename');
      }

      setRenameModal(null);
      
      // Navigate to new URL if href changed
      if (data.newHref && renameModal.type === 'document') {
        router.push(data.newHref);
      }
      
      router.refresh();
    } catch (error) {
      console.error('Error renaming:', error);
      alert(error instanceof Error ? error.message : 'Failed to rename');
    }
  }, [renameModal, router]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModal) return;

    setIsDeleting(true);
    try {
      const endpoint = deleteModal.type === 'project' 
        ? '/api/projects' 
        : '/api/docs';
      
      const response = await fetch(`${endpoint}/${deleteModal.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          projectId: deleteModal.projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete');
      }

      setDeleteModal(null);
      
      // Navigate away if we're on the deleted item's page
      if (deleteModal.type === 'project') {
        router.push('/docs');
        // Wait a bit for navigation, then refresh
        setTimeout(() => {
          router.refresh();
        }, 100);
      } else if (deleteModal.projectId) {
        router.push(`/docs/projects/${deleteModal.projectId}`);
        setTimeout(() => {
          router.refresh();
        }, 100);
      } else {
        router.push('/docs');
        setTimeout(() => {
          router.refresh();
        }, 100);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteModal, router]);

  const RenameModalComponent = renameModal ? (
    <RenameModal
      isOpen={renameModal.isOpen}
      onClose={() => setRenameModal(null)}
      onSubmit={handleRenameSubmit}
      currentName={renameModal.currentName}
      itemType={renameModal.type}
    />
  ) : null;

  const DeleteModalComponent = deleteModal ? (
    <DeleteConfirmModal
      isOpen={deleteModal.isOpen}
      onClose={() => setDeleteModal(null)}
      onConfirm={handleDeleteConfirm}
      itemName={deleteModal.name}
      itemType={deleteModal.type}
      isDeleting={isDeleting}
    />
  ) : null;

  return {
    handleRenameProject,
    handleRenameDoc,
    handleDeleteProject,
    handleDeleteDoc,
    RenameModal: () => RenameModalComponent,
    DeleteModal: () => DeleteModalComponent,
  };
}

