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
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Extension } from "@tiptap/core";
import { useState, useEffect, useRef } from "react";

import { createLowlight } from "lowlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";

import { EditorToolbar } from "./EditorToolbar";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { TableBubbleMenu } from "./TableBubbleMenu";
import { TableControls } from "./TableControls";

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
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const slashCommandRef = useRef<{ from: number; to: number } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[400px] px-8 py-6",
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const files = event.dataTransfer.files;
          const file = files[0];

          if (file.type.startsWith('image/')) {
            event.preventDefault();
            
            if (file.size > 5 * 1024 * 1024) {
              alert("File size should not exceed 5MB");
              return true;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
              const url = e.target?.result as string;
              if (url && editor) {
                const { schema } = view.state;
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (coordinates) {
                  const node = schema.nodes.image.create({ src: url });
                  const transaction = view.state.tr.insert(coordinates.pos, node);
                  view.dispatch(transaction);
                }
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
        link: false, // We'll add Link separately
        underline: false, // We'll add Underline separately
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
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      CharacterCount,
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "bg-gray-100 rounded-md p-4 my-4",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full my-4",
        },
      }),
      TableRow,
      TableHeader.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            backgroundColor: {
              default: null,
              parseHTML: element => {
                // Try data attribute first, then inline style
                const dataColor = element.getAttribute('data-background-color');
                if (dataColor) return dataColor;
                
                // Parse from inline style if present
                const style = element.getAttribute('style');
                if (style) {
                  const bgMatch = style.match(/background-color:\s*([^;!]+)/i);
                  if (bgMatch) {
                    return bgMatch[1].trim();
                  }
                }
                return null;
              },
            },
            textColor: {
              default: null,
              parseHTML: element => {
                // Try data attribute first, then inline style
                const dataColor = element.getAttribute('data-text-color');
                if (dataColor) return dataColor;
                
                // Parse from inline style if present
                const style = element.getAttribute('style');
                if (style) {
                  const colorMatch = style.match(/color:\s*([^;!]+)/i);
                  if (colorMatch) {
                    return colorMatch[1].trim();
                  }
                }
                return null;
              },
            },
            textAlign: {
              default: 'left',
              parseHTML: element => {
                // Try inline style first
                const style = element.getAttribute('style');
                if (style) {
                  const alignMatch = style.match(/text-align:\s*([^;!]+)/i);
                  if (alignMatch) {
                    return alignMatch[1].trim();
                  }
                }
                return element.style.textAlign || 'left';
              },
            },
            verticalAlign: {
              default: 'top',
              parseHTML: element => {
                // Try inline style first
                const style = element.getAttribute('style');
                if (style) {
                  const vAlignMatch = style.match(/vertical-align:\s*([^;!]+)/i);
                  if (vAlignMatch) {
                    return vAlignMatch[1].trim();
                  }
                }
                return element.style.verticalAlign || 'top';
              },
            },
          };
        },
        renderHTML({ HTMLAttributes, node }) {
          const attrs: Record<string, any> = { ...HTMLAttributes };
          const styles: string[] = [];
          
          // Build style string from all node attributes
          // Use !important to override CSS rules with !important
          if (node.attrs.textColor) {
            styles.push(`color: ${node.attrs.textColor} !important`);
            attrs['data-text-color'] = node.attrs.textColor;
          }
          
          if (node.attrs.backgroundColor) {
            styles.push(`background-color: ${node.attrs.backgroundColor} !important`);
            attrs['data-background-color'] = node.attrs.backgroundColor;
          }
          
          if (node.attrs.textAlign) {
            // Always include text-align, even if it's 'left', to override CSS
            styles.push(`text-align: ${node.attrs.textAlign} !important`);
          }
          
          if (node.attrs.verticalAlign) {
            // Always include vertical-align, even if it's 'top', to override CSS
            styles.push(`vertical-align: ${node.attrs.verticalAlign} !important`);
          }
          
          // Merge with existing HTMLAttributes.style if any
          if (HTMLAttributes.style) {
            if (typeof HTMLAttributes.style === 'string') {
              // Parse and merge existing styles, avoiding duplicates
              const existingStyles = HTMLAttributes.style.split(';').map(s => s.trim()).filter(s => s);
              existingStyles.forEach(existingStyle => {
                const prop = existingStyle.split(':')[0].trim();
                // Only add if not already in our styles array
                if (!styles.some(s => s.startsWith(prop))) {
                  styles.push(existingStyle);
                }
              });
            }
          }
          
          if (styles.length > 0) {
            attrs.style = styles.join('; ');
          }
          
          // Return the proper structure: ['th', attrs, content]
          // Use 0 to indicate default content rendering (Tiptap will handle content)
          return ['th', attrs, 0];
        },
      }).configure({
        HTMLAttributes: {
          class: "border border-gray-300 bg-gray-100 px-4 py-2 text-left font-semibold",
        },
      }),
    TableCell.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
            backgroundColor: {
              default: null,
              parseHTML: element => {
                // Try data attribute first, then inline style
                const dataColor = element.getAttribute('data-background-color');
                if (dataColor) return dataColor;
                
                // Parse from inline style if present
                const style = element.getAttribute('style');
                if (style) {
                  const bgMatch = style.match(/background-color:\s*([^;!]+)/i);
                  if (bgMatch) {
                    return bgMatch[1].trim();
                  }
                }
                return null;
              },
            },
            textColor: {
              default: null,
              parseHTML: element => {
                // Try data attribute first, then inline style
                const dataColor = element.getAttribute('data-text-color');
                if (dataColor) return dataColor;
                
                // Parse from inline style if present
                const style = element.getAttribute('style');
                if (style) {
                  const colorMatch = style.match(/color:\s*([^;!]+)/i);
                  if (colorMatch) {
                    return colorMatch[1].trim();
                  }
                }
                return null;
              },
            },
            textAlign: {
              default: 'left',
              parseHTML: element => element.style.textAlign || 'left',
            },
            verticalAlign: {
              default: 'top',
              parseHTML: element => element.style.verticalAlign || 'top',
            },
          };
        },
        renderHTML({ HTMLAttributes, node }) {
          const attrs: Record<string, any> = { ...HTMLAttributes };
          const styles: string[] = [];
          
          // Build style string from all node attributes
          // Use !important to override CSS rules with !important
          if (node.attrs.textColor) {
            styles.push(`color: ${node.attrs.textColor} !important`);
            attrs['data-text-color'] = node.attrs.textColor;
          }
          
          if (node.attrs.backgroundColor) {
            styles.push(`background-color: ${node.attrs.backgroundColor} !important`);
            attrs['data-background-color'] = node.attrs.backgroundColor;
          }
          
          if (node.attrs.textAlign) {
            // Always include text-align, even if it's 'left', to override CSS
            styles.push(`text-align: ${node.attrs.textAlign} !important`);
          }
          
          if (node.attrs.verticalAlign) {
            // Always include vertical-align, even if it's 'top', to override CSS
            styles.push(`vertical-align: ${node.attrs.verticalAlign} !important`);
          }
          
          // Merge with existing HTMLAttributes.style if any
          if (HTMLAttributes.style) {
            if (typeof HTMLAttributes.style === 'string') {
              // Parse and merge existing styles, avoiding duplicates
              const existingStyles = HTMLAttributes.style.split(';').map(s => s.trim()).filter(s => s);
              existingStyles.forEach(existingStyle => {
                const prop = existingStyle.split(':')[0].trim();
                // Only add if not already in our styles array
                if (!styles.some(s => s.startsWith(prop))) {
                  styles.push(existingStyle);
                }
              });
            }
          }
          
          if (styles.length > 0) {
            attrs.style = styles.join('; ');
          }
          
          // Return the proper structure: ['td', attrs, content]
          // Use 0 to indicate default content rendering (Tiptap will handle content)
          return ['td', attrs, 0];
        },
      }).configure({
        HTMLAttributes: {
          class: "border border-gray-300 px-4 py-2",
        },
      }),
    ],
    content: initialContent,
    parseOptions: {
      preserveWhitespace: 'full',
    },
    onUpdate: ({ editor }) => {
      // Detect slash command
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;
      
      // Get text before cursor
      const textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - 1),
        $from.parentOffset,
        undefined,
        '\ufffc'
      );
      
      // Check if the last character is /
      if (textBefore === '/') {
        // Get cursor coordinates
        const coords = editor.view.coordsAtPos($from.pos);
        const editorRect = editor.view.dom.getBoundingClientRect();
        
        setSlashMenuPosition({
          top: coords.bottom,
          left: coords.left,
        });
        
        // Store the position to delete "/" later
        slashCommandRef.current = {
          from: $from.pos - 1,
          to: $from.pos,
        };
        
        setShowSlashMenu(true);
      } else if (showSlashMenu && textBefore !== '/') {
        // Close menu if user continues typing after /
        setShowSlashMenu(false);
      }
    },
  });

  const handleCloseSlashMenu = () => {
    setShowSlashMenu(false);
    // Delete the "/" character
    if (editor && slashCommandRef.current) {
      editor
        .chain()
        .focus()
        .deleteRange(slashCommandRef.current)
        .run();
      slashCommandRef.current = null;
    }
  };

  return (
    <div className="w-full flex flex-col max-w-full relative">
      {/* Header with close button - NOT sticky */}
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

      {/* Toolbar - Sticky at top */}
      <div className="editor-toolbar-wrapper sticky top-16 z-30 bg-white w-full mb-4 pt-4">
        <EditorToolbar editor={editor} />
      </div>

      {/* Editor Content */}
      <div className="flex-1 tiptap-editor w-full relative">
        <EditorContent editor={editor} />
        {editor && <TableBubbleMenu editor={editor} />}
        {editor && <TableControls editor={editor} />}
      </div>

      {/* Slash Command Menu */}
      {editor && (
        <SlashCommandMenu
          editor={editor}
          isOpen={showSlashMenu}
          onClose={handleCloseSlashMenu}
          position={slashMenuPosition}
        />
      )}
    </div>
  );
}

