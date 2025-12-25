"use client";

import { Editor } from "@tiptap/react";
import { useEffect, useState, useCallback } from "react";
import React from "react";

interface SlashCommandMenuProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
}

interface CommandItem {
  title: string;
  description?: string;
  icon: React.ReactNode;
  command: () => void;
  category: string;
}

export function SlashCommandMenu({ editor, isOpen, onClose, position }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredItems, setFilteredItems] = useState<CommandItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const commands: CommandItem[] = [
    // Text Formatting
    {
      title: "Heading 1",
      description: "Large section heading",
      category: "Text",
      icon: (
        <span className="font-bold text-lg">H1</span>
      ),
      command: () => {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        onClose();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      category: "Text",
      icon: (
        <span className="font-bold text-base">H2</span>
      ),
      command: () => {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        onClose();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      category: "Text",
      icon: (
        <span className="font-bold text-sm">H3</span>
      ),
      command: () => {
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        onClose();
      },
    },
    // Lists
    {
      title: "Bullet List",
      description: "Create a simple bullet list",
      category: "List",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      command: () => {
        editor.chain().focus().toggleBulletList().run();
        onClose();
      },
    },
    {
      title: "Numbered List",
      description: "Create a list with numbering",
      category: "List",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-10 4h10" />
        </svg>
      ),
      command: () => {
        editor.chain().focus().toggleOrderedList().run();
        onClose();
      },
    },
    {
      title: "To-do List",
      description: "Track tasks with a checklist",
      category: "List",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      command: () => {
        editor.chain().focus().toggleTaskList().run();
        onClose();
      },
    },
    // Blocks
    {
      title: "Blockquote",
      description: "Capture a quote",
      category: "Block",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      command: () => {
        editor.chain().focus().toggleBlockquote().run();
        onClose();
      },
    },
    {
      title: "Code Block",
      description: "Display code with syntax highlighting",
      category: "Block",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      command: () => {
        editor.chain().focus().toggleCodeBlock().run();
        onClose();
      },
    },
    {
      title: "Horizontal Rule",
      description: "Visually divide blocks",
      category: "Block",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      ),
      command: () => {
        editor.chain().focus().setHorizontalRule().run();
        onClose();
      },
    },
    // Insert
    {
      title: "Table",
      description: "Insert a simple table",
      category: "Insert",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      command: () => {
        // Insert a 3x3 table
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        onClose();
      },
    },
  ];

  useEffect(() => {
    if (isOpen) {
      const filtered = searchQuery
        ? commands.filter(
            (item) =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : commands;
      setFilteredItems(filtered);
      setSelectedIndex(0);
    }
  }, [isOpen, searchQuery]);

  const executeCommand = useCallback(
    (index: number) => {
      const item = filteredItems[index];
      if (item) {
        item.command();
      }
    },
    [filteredItems]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        executeCommand(selectedIndex);
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems.length, executeCommand, onClose]);

  if (!isOpen || filteredItems.length === 0) return null;

  // Group by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div
        className="absolute z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className="p-2">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {category}
              </div>
              {items.map((item, index) => {
                const globalIndex = filteredItems.indexOf(item);
                return (
                  <button
                    key={item.title}
                    type="button"
                    className={`w-full text-left px-3 py-2.5 rounded-md flex items-start gap-3 transition-colors ${
                      selectedIndex === globalIndex
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      executeCommand(globalIndex);
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-600 bg-gray-50 rounded">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

