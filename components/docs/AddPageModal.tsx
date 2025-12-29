"use client";

import React, { useState, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

interface AddPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => void | Promise<void>;
  docName?: string;
}

export const AddPageModal: React.FC<AddPageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  docName,
}) => {
  const [pageTitle, setPageTitle] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [errors, setErrors] = useState<{ title?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPageTitle('');
      setPageContent('');
      setErrors({});
    }
  }, [isOpen]);

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
    const newErrors: { title?: string } = {};

    if (!pageTitle.trim()) {
      newErrors.title = 'Page title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onSubmit(pageTitle.trim(), pageContent.trim());
      } catch (error) {
        console.error('Error submitting form:', error);
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
        className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Add New Page</h2>
          <p className="text-sm text-gray-500 mt-1">
            {docName ? `Add a new page to ${docName}` : 'Add a new page to this document'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-5">
            {/* Page Title Field */}
            <div>
              <label
                htmlFor="page-title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Page Title <span className="text-red-500">*</span>
              </label>
              <Input
                id="page-title"
                type="text"
                value={pageTitle}
                onChange={(e) => {
                  setPageTitle(e.target.value);
                  if (errors.title) {
                    setErrors((prev) => ({ ...prev, title: undefined }));
                  }
                }}
                placeholder="Enter page title"
                className={cn(
                  'border-gray-300 focus:border-gray-400 focus:ring-gray-200',
                  errors.title && 'border-red-500 focus-visible:ring-red-500 focus:border-red-500'
                )}
                autoFocus
              />
              {errors.title && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.title}
                </p>
              )}
            </div>

            {/* Page Content Field */}
            <div>
              <label
                htmlFor="page-content"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Page Content <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <textarea
                id="page-content"
                value={pageContent}
                onChange={(e) => setPageContent(e.target.value)}
                placeholder="Enter page content"
                rows={4}
                className={cn(
                  'flex w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 focus-visible:ring-offset-0 focus-visible:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors'
                )}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                You can edit this content later after the page is created.
              </p>
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
              {isSubmitting ? 'Adding...' : 'Add Page'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

