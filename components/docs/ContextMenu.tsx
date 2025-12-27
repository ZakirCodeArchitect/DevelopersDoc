"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ContextMenuProps {
  onRename: () => void;
  onDelete: () => void;
  className?: string;
  onMenuStateChange?: (isOpen: boolean) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  onRename,
  onDelete,
  className,
  onMenuStateChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (onMenuStateChange) {
      onMenuStateChange(isOpen);
    }
  }, [isOpen, onMenuStateChange]);

  // Handle clicks outside the menu
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking on the button or menu
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      
      setIsOpen(false);
      setMenuPosition(null);
    };

    // Use requestAnimationFrame to ensure the menu is rendered first
    const frameId = requestAnimationFrame(() => {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
      }, 0);
    });

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);

  const calculateMenuPosition = () => {
    if (!buttonRef.current) return null;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = 80; // Approximate height for 2 items
    const spacing = 8; // Spacing between button and menu
    
    // Calculate position
    const top = rect.bottom + spacing;
    const right = window.innerWidth - rect.right;
    
    // Check if menu would go off bottom of screen
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    let finalTop = top;
    if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
      // Position above the button
      finalTop = rect.top - menuHeight - spacing;
    }
    
    return { top: finalTop, right };
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newIsOpen = !isOpen;
    
    if (newIsOpen) {
      // Calculate position immediately when opening
      const position = calculateMenuPosition();
      if (position) {
        setMenuPosition(position);
        setIsOpen(true);
      }
    } else {
      setIsOpen(false);
      setMenuPosition(null);
    }
  };

  const menuContent = isOpen && menuPosition && mounted ? (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100]" 
        onClick={() => {
          setIsOpen(false);
          setMenuPosition(null);
        }}
      />
      {/* Dropdown Menu - Fixed positioning with very high z-index to appear above sidebar */}
      <div 
        ref={menuRef}
        className="fixed z-[101] w-40 bg-white rounded-md shadow-lg border border-gray-200 py-1"
        style={{
          top: `${menuPosition.top}px`,
          right: `${menuPosition.right}px`,
        }}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
            setMenuPosition(null);
            onRename();
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Rename
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
            setMenuPosition(null);
            onDelete();
          }}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </>
  ) : null;

  return (
    <>
      <div 
        className={cn('relative', className)} 
        data-menu-open={isOpen ? 'true' : undefined}
      >
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-gray-700 flex-shrink-0"
          aria-label="More options"
          title="More options"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
            />
          </svg>
        </button>
      </div>
      {mounted && createPortal(menuContent, document.body)}
    </>
  );
};

