"use client";

import React, { useState, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newName: string) => void | Promise<void>;
  currentName: string;
  itemType?: 'project' | 'document';
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentName,
  itemType = 'document',
}) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
      setError('');
    } else {
      setNewName('');
      setError('');
    }
  }, [isOpen, currentName]);

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
    if (!newName.trim()) {
      setError(`${itemType === 'project' ? 'Project' : 'Document'} name is required`);
      return false;
    }
    if (newName.trim() === currentName) {
      setError('Name must be different from current name');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onSubmit(newName.trim());
      } catch (error) {
        console.error('Error renaming:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div 
        className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Rename {itemType === 'project' ? 'Project' : 'Document'}</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div>
            <label
              htmlFor="new-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="new-name"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (error) setError('');
              }}
              placeholder={`Enter new ${itemType} name`}
              className={cn(
                'border-gray-300 focus:border-gray-400 focus:ring-gray-200',
                error && 'border-red-500 focus-visible:ring-red-500 focus:border-red-500'
              )}
              autoFocus
            />
            {error && (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
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
              {isSubmitting ? 'Renaming...' : 'Rename'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

