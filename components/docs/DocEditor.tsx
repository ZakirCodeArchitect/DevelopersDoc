"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import CharacterCount from "@tiptap/extension-character-count";

import { createLowlight } from "lowlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";

import { EditorToolbar } from "./EditorToolbar";

// Create lowlight instance
const lowlight = createLowlight();

type DocEditorProps = {
  initialContent?: any; // JSON
  onSave?: (json: any) => void | Promise<void>;
  onClose?: () => void;
};

export default function DocEditor({
  initialContent,
  onSave,
  onClose,
}: DocEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      Placeholder.configure({
        placeholder: ({ node, pos, editor }) => {
          // Placeholder for H1 heading (page title)
          if (node.type.name === 'heading' && node.attrs?.level === 1) {
            return 'Add Page Title...';
          }

          // Placeholder for paragraphs
          if (node.type.name === 'paragraph') {
            const doc = editor.state.doc;
            
            // Description paragraph (second child, index 1)
            if (doc.childCount >= 2 && doc.child(1) === node) {
              return 'Add Page Description...';
            }
            
            // First content paragraph below border (third child, index 2)
            // Only show if this is the only content paragraph (doc has exactly 3 children)
            if (doc.childCount === 3 && doc.child(2) === node) {
              return 'Start typing your documentation...';
            }
            
            // No placeholder for other paragraphs
            return '';
          }
          
          return '';
        },
        showOnlyWhenEditable: true,
        showOnlyCurrent: false, // Show placeholder for all empty nodes, not just the current one
        includeChildren: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      CharacterCount,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "bg-gray-100 rounded-md p-4 my-4",
        },
      }),
    ],
    content: initialContent,
    parseOptions: {
      preserveWhitespace: 'full',
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[400px] px-4 py-2",
      },
    },
  });

  return (
    <div className="w-full flex flex-col">
      {/* Header with close button */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Edit Page</span>
          {editor && (
            <span className="text-xs text-gray-500">
              {editor.storage.characterCount.characters()} characters
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              if (editor && onSave) {
                await onSave(editor.getJSON());
              }
            }}
            className="px-4 py-2 bg-[#CC561E] hover:bg-[#B84A17] text-white rounded-md transition-colors text-sm font-medium"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor Content */}
      <div className="flex-1 tiptap-editor">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

