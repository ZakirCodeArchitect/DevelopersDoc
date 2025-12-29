"use client";

import React, { useState, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface PublishValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentName,
}) => {
  const router = useRouter();
  const [isPublished, setIsPublished] = useState(false);
  const [publishSlug, setPublishSlug] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [validation, setValidation] = useState<PublishValidation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch publish status when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPublishStatus();
      setError(null);
      setSuccess(null);
      setCustomSlug('');
    }
  }, [isOpen, documentId]);

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchPublishStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/publish`);
      if (response.ok) {
        const data = await response.json();
        setIsPublished(data.isPublished || false);
        setPublishSlug(data.publishSlug || '');
        setValidation(data.validation || null);
      } else {
        setError('Failed to load publish status');
      }
    } catch (err) {
      console.error('Error fetching publish status:', err);
      setError('Failed to load publish status');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handlePublish = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customSlug: customSlug.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsPublished(true);
        setPublishSlug(data.document.publishSlug);
        setSuccess('Document published successfully!');
        // Refresh the page to update UI
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        setError(data.error || 'Failed to publish document');
        if (data.validation) {
          setValidation(data.validation);
        }
      }
    } catch (err) {
      console.error('Error publishing document:', err);
      setError('Failed to publish document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/publish`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsPublished(false);
        setSuccess('Document unpublished successfully!');
        // Refresh the page to update UI
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        setError(data.error || 'Failed to unpublish document');
      }
    } catch (err) {
      console.error('Error unpublishing document:', err);
      setError('Failed to unpublish document');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div 
        className="relative z-10 bg-white rounded-xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {isPublished ? 'Publish Settings' : 'Publish Document'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {isLoadingStatus ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC561E]"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : (
            <>
              {/* Validation Errors */}
              {validation && !validation.isValid && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-red-900 mb-2">
                    Publishing Requirements Not Met
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                    {validation.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation Warnings */}
              {validation && validation.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                    Recommendations
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                    {validation.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Published Status */}
              {isPublished && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm font-semibold text-blue-900">
                      This document is published
                    </p>
                  </div>
                  <p className="text-sm text-blue-800 mb-3">
                    Your document is publicly visible to all authenticated users.
                  </p>
                  <div className="bg-white rounded p-3 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Public URL:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded flex-1">
                        /docs/published/{publishSlug}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/docs/published/${publishSlug}`
                          );
                          setSuccess('URL copied to clipboard!');
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Slug Input */}
              {!isPublished && validation?.isValid && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom URL Slug (optional)
                  </label>
                  <Input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="my-awesome-docs"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to auto-generate from document title. Only letters, numbers, and hyphens allowed.
                  </p>
                </div>
              )}

              {/* Publishing Info */}
              {!isPublished && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    What happens when you publish?
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>Your document becomes publicly visible to all authenticated users</li>
                    <li>Anyone who signs up can view your published documentation</li>
                    <li>You can unpublish at any time</li>
                    <li>Your document will appear in the published documentation directory</li>
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={onClose}
                  variant="outline"
                  disabled={isLoading}
                >
                  {isPublished ? 'Close' : 'Cancel'}
                </Button>
                {isPublished ? (
                  <Button
                    onClick={handleUnpublish}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? 'Unpublishing...' : 'Unpublish'}
                  </Button>
                ) : (
                  <Button
                    onClick={handlePublish}
                    disabled={isLoading || !validation?.isValid}
                    className="bg-[#CC561E] hover:bg-[#B84A17] text-white"
                  >
                    {isLoading ? 'Publishing...' : 'Publish Document'}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

