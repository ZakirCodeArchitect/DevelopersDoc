"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void | Promise<void>;
  isSubmitting?: boolean; // External submitting state from handler
  storedFormValues?: { name: string; description: string } | null; // Values stored in handler (persist across remounts)
}

// Internal component - will be wrapped with React.memo
const CreateProjectModalComponent: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting: externalIsSubmitting = false,
  storedFormValues,
}) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  
  // Use external submitting state if provided, otherwise use internal
  const isSubmitting = externalIsSubmitting || internalIsSubmitting;

  // Track previous open state to detect when modal opens fresh
  const prevIsOpenRef = React.useRef(false);
  // Track if this is the first render after mount (to prevent clearing during remount)
  const isFirstRenderRef = React.useRef(true);
  
  // Store form values in ref when they exist, to recover if component remounts
  const formValuesRef = React.useRef<{ projectName: string; description: string } | null>(null);
  
  // Update ref whenever form values change
  React.useEffect(() => {
    if (projectName || description) {
      formValuesRef.current = { projectName, description };
    }
  }, [projectName, description]);
  
  // CRITICAL: Restore form values from handler's stored values if component remounted
  React.useEffect(() => {
    if (storedFormValues && (!projectName || !description)) {
      if (!projectName && storedFormValues.name) {
        setProjectName(storedFormValues.name);
      }
      if (!description && storedFormValues.description) {
        setDescription(storedFormValues.description);
      }
    }
  }, [storedFormValues, projectName, description]);
  
  useEffect(() => {
    // Mark that we've completed the first render
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
    }
    
    const wasOpen = prevIsOpenRef.current;
    const isOpening = isOpen && !wasOpen;
    
    // CRITICAL: Only clear form when modal opens fresh AND we're NOT submitting
    // Never clear during submission - this prevents form from being cleared when component remounts
    // Also don't clear if form has values (extra safeguard)
    // Don't clear on first render if modal is already open (prevents clearing during remount)
    if (isOpening && !isSubmitting && !projectName && !description && !isFirstRenderRef.current) {
      setProjectName('');
      setDescription('');
      setErrors({});
      setInternalIsSubmitting(false);
    } else if (isOpening && (isSubmitting || projectName || description || isFirstRenderRef.current)) {
      // Prevented clearing - form has values or is submitting
    }
    
    prevIsOpenRef.current = isOpen;
  }, [isOpen, isSubmitting, projectName, description]);


  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: { name?: string; description?: string } = {};

    if (!projectName.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate() && !isSubmitting) {
      // Capture form values
      const nameValue = projectName.trim();
      const descValue = description.trim();
      
      // Set submitting state - form values remain in state (not cleared)
      setInternalIsSubmitting(true);
      
      try {
        await onSubmit(nameValue, descValue);
      } catch (error) {
        console.error('Error submitting form:', error);
        setInternalIsSubmitting(false);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Keep modal visible while submitting, even if isOpen becomes false
  // This prevents the empty form flash
  if (!isOpen && !isSubmitting) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div 
        className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Create New Project</h2>
          <p className="text-sm text-gray-500 mt-1">Add a new project to your documentation</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-5">
            {/* Project Name Field */}
            <div>
              <label
                htmlFor="project-name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Project Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => {
                  if (!isSubmitting) {
                    setProjectName(e.target.value);
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }
                }}
                placeholder="Enter project name"
                disabled={isSubmitting}
                className={cn(
                  'border-gray-300 focus:border-gray-400 focus:ring-gray-200',
                  errors.name && 'border-red-500 focus-visible:ring-red-500 focus:border-red-500',
                  isSubmitting && 'opacity-60 cursor-not-allowed'
                )}
                autoFocus
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label
                htmlFor="project-description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="project-description"
                value={description}
                onChange={(e) => {
                  if (!isSubmitting) {
                    setDescription(e.target.value);
                    if (errors.description) {
                      setErrors((prev) => ({ ...prev, description: undefined }));
                    }
                  }
                }}
                placeholder="Enter project description"
                rows={4}
                disabled={isSubmitting}
                className={cn(
                  'flex w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 focus-visible:ring-offset-0 focus-visible:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors',
                  errors.description && 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500',
                  isSubmitting && 'opacity-60'
                )}
              />
              {errors.description && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="bg-[#CC561E] hover:bg-[#B84A17] text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Set display name for better debugging
CreateProjectModalComponent.displayName = 'CreateProjectModalComponent';

// Export memoized version - React.memo prevents remounting
// It will re-render with new props when they change, but the component instance stays the same
// This preserves state (projectName, description) even when isSubmitting changes
export const CreateProjectModal = React.memo(CreateProjectModalComponent);
CreateProjectModal.displayName = 'CreateProjectModal';
