"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Share {
  id: string;
  email: string;
  role: string;
  status: string;
  sharedWithUser?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
  } | null;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'document' | 'project';
  itemId: string;
  itemName: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  type,
  itemId,
  itemName,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [shares, setShares] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch shares when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchShares();
      // Reset form state when modal opens
      setEmail('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, itemId]);

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchShares = async () => {
    setIsLoadingShares(true);
    setError(null);
    try {
      const endpoint = type === 'document' 
        ? `/api/documents/${itemId}/share`
        : `/api/projects/${itemId}/share`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success) {
        setShares(data.shares || []);
      } else {
        setError('Failed to load shares');
      }
    } catch (err) {
      console.error('Error fetching shares:', err);
      setError('Failed to load shares');
    } finally {
      setIsLoadingShares(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    // Validate role
    if (role !== 'viewer' && role !== 'editor') {
      setError('Invalid role selected');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const endpoint = type === 'document'
        ? `/api/documents/${itemId}/share`
        : `/api/projects/${itemId}/share`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), role: role as 'viewer' | 'editor' }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Shared successfully');
        setEmail(''); // Clear email input
        setError(null); // Clear any previous errors
        await fetchShares(); // Refresh shares list
      } else {
        setError(data.error || 'Failed to share');
        setSuccess(null);
      }
    } catch (err) {
      console.error('Error sharing:', err);
      setError('Failed to share. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to remove this share?')) {
      return;
    }

    try {
      const endpoint = type === 'document'
        ? `/api/documents/${itemId}/share`
        : `/api/projects/${itemId}/share`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shareId }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchShares(); // Refresh shares list
        setSuccess('Share removed successfully');
      } else {
        setError(data.error || 'Failed to remove share');
      }
    } catch (err) {
      console.error('Error removing share:', err);
      setError('Failed to remove share. Please try again.');
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
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
        className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Share {type === 'document' ? 'Document' : 'Project'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Share <strong>{itemName}</strong> with others
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Share Form */}
          <form onSubmit={handleShare} className="mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className={cn(
                      "flex-1 border-gray-300 focus:border-gray-400 focus:ring-gray-200",
                      isLoading && "opacity-60 cursor-not-allowed"
                    )}
                    disabled={isLoading}
                    autoFocus
                  />
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
                      className={cn(
                        "h-10 w-[160px] pl-4 pr-12 border border-gray-300 rounded-md text-sm bg-white",
                        "focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-colors cursor-pointer appearance-none"
                      )}
                      disabled={isLoading}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {success}
                </div>
              )}
            </div>
            
            {/* Submit Button */}
            <div className="mt-4">
              <Button 
                type="submit" 
                disabled={isLoading || !email.trim()}
                className="w-full bg-[#CC561E] hover:bg-[#B84A17] text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sharing...' : 'Share'}
              </Button>
            </div>
          </form>

          {/* Shares List */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Shared with
              </h3>
              <span className="text-sm text-gray-500">
                {shares.length}
              </span>
            </div>
            
            {isLoadingShares ? (
              <div className="text-center py-8">
                <div className="text-sm text-gray-500">Loading...</div>
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <svg
                  className="w-12 h-12 text-gray-400 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-sm text-gray-500">No shares yet</p>
                <p className="text-xs text-gray-400 mt-1">Share this {type} to collaborate with others</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {share.sharedWithUser?.imageUrl ? (
                          <img
                            src={share.sharedWithUser.imageUrl}
                            alt={share.sharedWithUser.email}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs text-gray-600 font-medium">
                              {(share.sharedWithUser?.email || share.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {share.sharedWithUser?.email || share.email}
                            </span>
                          </div>
                          {share.sharedWithUser?.firstName && (
                            <p className="text-xs text-gray-500 truncate">
                              {share.sharedWithUser.firstName} {share.sharedWithUser.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded font-medium",
                          share.role === 'editor' 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-gray-200 text-gray-700"
                        )}>
                          {share.role === 'editor' ? 'Can edit' : 'Can view'}
                        </span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded font-medium",
                          share.status === 'accepted'
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        )}>
                          {share.status === 'accepted' ? 'Active' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveShare(share.id)}
                      className="ml-3 text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors flex-shrink-0"
                      title="Remove share"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

