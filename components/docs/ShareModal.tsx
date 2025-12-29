"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

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
  canShare?: boolean; // If false, hide the share form (for viewers)
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  type,
  itemId,
  itemName,
  canShare = true, // Default to true for backward compatibility
}) => {
  const { user } = useUser();
  const router = useRouter();
  const currentUserEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [shares, setShares] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [effectiveCanShare, setEffectiveCanShare] = useState(canShare);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);

  // Fetch shares when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchShares();
      // Reset form state when modal opens
      setEmail('');
      setError(null);
      setSuccess(null);
      setOpenDropdownId(null);
      // Reset effective canShare to the prop value initially
      setEffectiveCanShare(canShare);
      setCurrentUserRole(null);
    }
  }, [isOpen, itemId, canShare]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.manage-access-dropdown')) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdownId]);

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
        
        // Determine current user's role
        if (currentUserEmail) {
          // Check if user is the owner
          const isOwner = data.owner?.email?.toLowerCase() === currentUserEmail;
          
          if (isOwner) {
            setCurrentUserRole('owner');
            setEffectiveCanShare(true);
          } else {
            // Find user's share to determine their role
            const userShare = (data.shares || []).find((share: Share) => 
              share.sharedWithUser?.email?.toLowerCase() === currentUserEmail ||
              share.email?.toLowerCase() === currentUserEmail
            );
            
            if (userShare) {
              const role = userShare.role === 'editor' ? 'editor' : 'viewer';
              setCurrentUserRole(role);
              setEffectiveCanShare(role === 'editor');
            } else {
              // User not found (shouldn't happen if they have access)
              setCurrentUserRole(null);
              setEffectiveCanShare(false);
            }
          }
        } else {
          setCurrentUserRole(null);
          setEffectiveCanShare(canShare);
        }
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

  const handleUpdateRole = async (shareId: string, newRole: 'viewer' | 'editor', shareEmail: string) => {
    setIsLoadingShares(true);
    setError(null);
    setSuccess(null);
    setOpenDropdownId(null); // Close dropdown

    try {
      const endpoint = type === 'document'
        ? `/api/documents/${itemId}/share`
        : `/api/projects/${itemId}/share`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: shareEmail, role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchShares(); // Refresh shares list
        setSuccess(`Access updated to ${newRole}`);
      } else {
        setError(data.error || 'Failed to update access');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update access. Please try again.');
    } finally {
      setIsLoadingShares(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    setOpenDropdownId(null); // Close dropdown
    setIsLoadingShares(true);
    setError(null);
    setSuccess(null);

    // Find the share to check if it's the current user's own share
    const shareToRemove = shares.find(s => s.id === shareId);
    const isRemovingSelf = shareToRemove && currentUserEmail && (
      shareToRemove.sharedWithUser?.email?.toLowerCase() === currentUserEmail ||
      shareToRemove.email?.toLowerCase() === currentUserEmail
    );

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
        // If user removed their own access, redirect to /docs
        if (isRemovingSelf) {
          router.push('/docs');
          return;
        }
        
        await fetchShares(); // Refresh shares list
        setSuccess('Access removed successfully');
      } else {
        setError(data.error || 'Failed to remove access');
      }
    } catch (err) {
      console.error('Error removing share:', err);
      setError('Failed to remove access. Please try again.');
    } finally {
      setIsLoadingShares(false);
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
        className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 transform transition-all overflow-visible"
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
                {effectiveCanShare 
                  ? <>Share <strong>{itemName}</strong> with others</>
                  : <>People who have access to <strong>{itemName}</strong></>
                }
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
        <div className={cn(
          "px-6 max-h-[calc(90vh-200px)] overflow-y-auto overflow-x-visible",
          effectiveCanShare ? "py-6" : "py-4"
        )}>
          {/* Share Form - Only show if user can share */}
          {effectiveCanShare && (
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
          )}

          {/* Shares List */}
          <div className={cn(
            effectiveCanShare ? "border-t border-gray-200 pt-6 mt-6" : "pt-0 mt-0"
          )}>
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
              <div className="space-y-2 relative">
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
                    </div>
                    <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                      {share.role === 'editor' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-200">
                          <svg
                            className="w-3.5 h-3.5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          <span className="text-xs font-medium text-blue-700">
                            Editor
                          </span>
                        </div>
                      )}
                      {share.role === 'viewer' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
                          <svg
                            className="w-3.5 h-3.5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          <span className="text-xs font-medium text-gray-600">
                            Viewer
                          </span>
                        </div>
                      )}
                      {/* Only show Manage Access dropdown if:
                          - User is owner/editor (can manage anyone), OR
                          - User is viewer AND this is their own share (can only manage themselves) */}
                      {(() => {
                        const isCurrentUser = currentUserEmail && (
                          share.sharedWithUser?.email?.toLowerCase() === currentUserEmail ||
                          share.email?.toLowerCase() === currentUserEmail
                        );
                        const canManageThisShare = 
                          currentUserRole === 'owner' || 
                          currentUserRole === 'editor' || 
                          (currentUserRole === 'viewer' && isCurrentUser);
                        
                        if (!canManageThisShare) return null;
                        
                        return (
                          <ManageAccessDropdown
                            share={share}
                            isOpen={openDropdownId === share.id}
                            onToggle={() => setOpenDropdownId(openDropdownId === share.id ? null : share.id)}
                            onUpdateRole={(newRole) => handleUpdateRole(share.id, newRole, share.email)}
                            onRemove={() => handleRemoveShare(share.id)}
                            currentUserEmail={currentUserEmail}
                          />
                        );
                      })()}
                    </div>
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

// Separate component for manage access dropdown to handle positioning
interface ManageAccessDropdownProps {
  share: Share;
  isOpen: boolean;
  onToggle: () => void;
  onUpdateRole: (role: 'viewer' | 'editor') => void;
  onRemove: () => void;
  currentUserEmail?: string | null;
}

const ManageAccessDropdown: React.FC<ManageAccessDropdownProps> = ({
  share,
  isOpen,
  onToggle,
  onUpdateRole,
  onRemove,
  currentUserEmail,
}) => {
  // Check if this is the current user's own share
  const isCurrentUser = currentUserEmail && (
    share.sharedWithUser?.email?.toLowerCase() === currentUserEmail ||
    share.email?.toLowerCase() === currentUserEmail
  );
  
  // If current user is a viewer, they cannot make themselves editor
  const canMakeEditor = !(isCurrentUser && share.role === 'viewer');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    } else {
      setPosition(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        buttonRef.current &&
        dropdownRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onToggle]);

  return (
    <div className="ml-3 relative manage-access-dropdown flex-shrink-0">
      <button
        ref={buttonRef}
        onClick={onToggle}
        className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors border border-gray-300"
        title="Manage access"
      >
        Manage access
      </button>
      {isOpen && position && (
        <div
          ref={dropdownRef}
          className="fixed w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[100]"
          style={{
            top: `${position.top}px`,
            right: `${position.right}px`,
          }}
        >
          <div className="py-1">
            {share.role !== 'editor' && canMakeEditor && (
              <button
                onClick={() => onUpdateRole('editor')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Make editor
              </button>
            )}
            {share.role !== 'viewer' && (
              <button
                onClick={() => onUpdateRole('viewer')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Make viewer
              </button>
            )}
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={onRemove}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Remove access
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

