"use client";

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();

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
        // Use requestAnimationFrame to ensure refresh happens after navigation
        router.push(data.newHref);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            router.refresh();
          });
        });
      } else {
        // Refresh immediately if no navigation needed (e.g., renaming while on project page)
        // Use double requestAnimationFrame to ensure it happens after any pending state updates
        // Also refresh the current pathname to ensure cache invalidation
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Force refresh by calling refresh multiple times if needed
            router.refresh();
            // Small delay to ensure the refresh is processed
            setTimeout(() => {
              router.refresh();
            }, 50);
          });
        });
      }
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
      // For document deletion, we need to refresh the project page to show updated document list
      if (deleteModal.type === 'project') {
        // Navigate to docs home
        router.push('/docs');
        // Wait for navigation, then refresh multiple times to ensure cache is cleared
        setTimeout(() => {
          router.refresh();
          setTimeout(() => {
            router.refresh();
          }, 100);
        }, 200);
      } else if (deleteModal.projectId) {
        // For document deletion, check if we're already on the project page
        const targetPath = `/docs/projects/${deleteModal.projectId}`;
        const isOnTargetPage = pathname === targetPath;
        
        if (isOnTargetPage) {
          // We're already on the project page, force multiple refreshes to clear cache
          // Use a combination of refresh and a small delay to ensure cache invalidation
          router.refresh();
          setTimeout(() => {
            router.refresh();
            // Third refresh to ensure cache is fully cleared
            setTimeout(() => {
              router.refresh();
              // If still not working after 1 second, force a hard reload as last resort
              setTimeout(() => {
                if (document.visibilityState === 'visible') {
                  window.location.reload();
                }
              }, 1000);
            }, 150);
          }, 100);
        } else {
          // Navigate to project page first, then refresh
          router.replace(targetPath);
          // Wait for navigation to complete, then refresh multiple times
          setTimeout(() => {
            router.refresh();
            setTimeout(() => {
              router.refresh();
              // Third refresh to ensure cache is fully cleared
              setTimeout(() => {
                router.refresh();
                // If still not working after 1.5 seconds, force a hard reload as last resort
                setTimeout(() => {
                  if (document.visibilityState === 'visible') {
                    window.location.reload();
                  }
                }, 1500);
              }, 150);
            }, 150);
          }, 400);
        }
      } else {
        // For "Your Docs" deletion
        router.push('/docs');
        setTimeout(() => {
          router.refresh();
          setTimeout(() => {
            router.refresh();
          }, 100);
        }, 200);
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

