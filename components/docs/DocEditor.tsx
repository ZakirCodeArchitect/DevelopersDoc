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
import { Plugin } from "@tiptap/pm/state";
import { useState, useEffect, useRef } from "react";

// Custom extension to preserve multiple spaces
const PreserveSpaces = Extension.create({
  name: 'preserveSpaces',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleTextInput: (view: any, from: number, to: number, text: string) => {
            console.log('🟢 [DEBUG PreserveSpaces] handleTextInput:', {
              text: JSON.stringify(text),
              hasMultipleSpaces: text.includes('  ')
            });
            
            // Convert multiple spaces to non-breaking spaces
            if (text.includes('  ')) {
              const processedText = text.replace(/ {2,}/g, (match) => {
                return ' ' + '\u00A0'.repeat(match.length - 1);
              });
              
              if (processedText !== text) {
                console.log('🟢 [DEBUG PreserveSpaces] Converting:', {
                  original: JSON.stringify(text),
                  processed: JSON.stringify(processedText)
                });
                const { state, dispatch } = view;
                const transaction = state.tr.insertText(processedText, from, to);
                dispatch(transaction);
                return true;
              }
            }
            return false;
          },
          handleKeyDown: (view: any, event: KeyboardEvent) => {
            // Intercept spacebar when there's already a space before cursor
            if (event.key === ' ' || event.key === 'Spacebar') {
              const { state } = view;
              const selection = state.selection;
              if (!selection) return false;
              const { $from } = selection;
              const textBefore = $from.parent.textBetween(
                Math.max(0, $from.parentOffset - 1),
                $from.parentOffset,
                undefined,
                '\ufffc'
              );
              
              // If there's a space before, insert non-breaking space instead
              if (textBefore === ' ' || textBefore === '\u00A0') {
                console.log('🟢 [DEBUG PreserveSpaces] Spacebar after space, inserting nbsp');
                const { dispatch } = view;
                const transaction = state.tr.insertText('\u00A0', $from.pos, $from.pos);
                dispatch(transaction);
                return true;
              }
            }
            return false;
          }
        }
      })
    ];
  }
});

import { createLowlight } from "lowlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";

// OPTIMIZATION: Import only the languages we actually use
// This reduces bundle size by 300-500KB compared to loading all languages
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import html from 'highlight.js/lib/languages/xml'; // HTML is under 'xml' in highlight.js
import css from 'highlight.js/lib/languages/css';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';

import { EditorToolbar } from "./EditorToolbar";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { TableBubbleMenu } from "./TableBubbleMenu";
import { TableControls } from "./TableControls";
import { DragHandle } from "./DragHandle";

// Create lowlight instance with only the languages we need
// This dramatically reduces bundle size (from ~500KB to ~50KB)
// Note: bash covers shell scripts, so we don't need a separate shellscript language
const lowlight = createLowlight({
  javascript,
  typescript,
  json,
  bash, // Covers bash and shell scripts
  python,
  html,
  css,
  sql,
  markdown,
});

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
  const [slashMenuPositionAbove, setSlashMenuPositionAbove] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const slashCommandRef = useRef<{ from: number; to: number } | null>(null);

  // Debug log to track isSaving changes
  useEffect(() => {
    console.log('🔵 [DEBUG isSaving State Changed]:', isSaving);
  }, [isSaving]);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[400px] px-8 py-6",
      },
      handleTextInput: (view, from, to, text) => {
        // DEBUG: Log ALL text input to see what we're receiving
        console.log('🟢 [DEBUG handleTextInput] Received text input:', {
          text: JSON.stringify(text),
          textLength: text.length,
          spaceCount: (text.match(/ /g) || []).length,
          hasMultipleSpaces: text.includes('  '),
          from,
          to
        });
        
        // Convert multiple spaces to non-breaking spaces to preserve them
        if (text.includes('  ')) {
          // Replace sequences of 2+ spaces with regular space + non-breaking spaces
          const processedText = text.replace(/ {2,}/g, (match) => {
            return ' ' + '\u00A0'.repeat(match.length - 1); // Use non-breaking space character
          });
          
          if (processedText !== text) {
            console.log('🟢 [DEBUG handleTextInput] Converting spaces:', {
              original: JSON.stringify(text),
              processed: JSON.stringify(processedText),
              originalLength: text.length,
              processedLength: processedText.length
            });
            
            // Insert the processed text manually
            const { state, dispatch } = view;
            const transaction = state.tr.insertText(processedText, from, to);
            dispatch(transaction);
            return true; // We handled it
          }
        }
        
        return false; // Let TipTap handle it normally
      },
      handleKeyDown: (view, event) => {
        // DEBUG: Log spacebar presses to see if we can intercept them
        if (event.key === ' ' || event.key === 'Spacebar') {
          const { state } = view;
          const selection = state.selection;
          if (!selection) return false;
          const { $from } = selection;
          const textBefore = $from.parent.textBetween(
            Math.max(0, $from.parentOffset - 1),
            $from.parentOffset,
            undefined,
            '\ufffc'
          );
          
          // If there's a space before the cursor, we're typing multiple spaces
          if (textBefore === ' ' || textBefore === '\u00A0') {
            console.log('🟢 [DEBUG handleKeyDown] Spacebar pressed after space:', {
              textBefore: JSON.stringify(textBefore),
              isSpace: textBefore === ' ',
              isNbsp: textBefore === '\u00A0'
            });
          }
        }
        return false; // Let TipTap handle it normally
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
      PreserveSpaces,
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
        link: false, // We'll add Link separately
        underline: false, // We'll add Underline separately
      }),
      Placeholder.configure({
        placeholder: ({ node, pos, editor }) => {
          const doc = editor.state.doc;
          
          // Placeholder for H1 heading (page title) - only for the first node
          if (node.type.name === 'heading' && node.attrs?.level === 1) {
            // Only show placeholder for the first H1 heading in the document
            if (doc.firstChild === node) {
              return 'Add Page Title...';
            }
            // No placeholder for other H1 headings
            return '';
          }

          // Placeholder for paragraphs
          if (node.type.name === 'paragraph') {
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
      // Process document to convert multiple spaces to non-breaking spaces
      const { state } = editor;
      let hasChanges = false;
      const tr = state.tr;
      
      // Walk through all text nodes and convert multiple spaces
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'text' && node.text && node.text.includes('  ')) {
          console.log('🟢 [DEBUG onUpdate] Found text with multiple spaces:', {
            text: JSON.stringify(node.text),
            pos,
            spaceCount: (node.text.match(/ /g) || []).length
          });
          
          // Replace sequences of 2+ spaces with space + non-breaking spaces
          const processedText = node.text.replace(/ {2,}/g, (match) => {
            return ' ' + '\u00A0'.repeat(match.length - 1);
          });
          
          if (processedText !== node.text) {
            console.log('🟢 [DEBUG onUpdate] Converting spaces:', {
              original: JSON.stringify(node.text),
              processed: JSON.stringify(processedText)
            });
            tr.replaceWith(pos, pos + node.nodeSize, state.schema.text(processedText, node.marks));
            hasChanges = true;
          }
        }
      });
      
      // Apply changes if any were made
      if (hasChanges) {
        console.log('🟢 [DEBUG onUpdate] Applying space conversion transaction');
        editor.view.dispatch(tr);
        // Don't process slash command if we made changes - return early
        return;
      }
      
      // Detect slash command
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
        // Get cursor coordinates relative to viewport
        const coords = editor.view.coordsAtPos($from.pos);
        // Get editor container's position relative to viewport
        const editorContainer = editor.view.dom.closest('.tiptap-editor') || editor.view.dom.parentElement;
        const editorRect = editorContainer?.getBoundingClientRect() || editor.view.dom.getBoundingClientRect();
        
        // Calculate available space below and above cursor
        const spaceBelow = editorRect.bottom - coords.bottom;
        const spaceAbove = coords.top - editorRect.top;
        const menuMaxHeight = 384; // max-h-96 = 24rem = 384px
        const menuGap = 4; // Gap between cursor and menu
        const menuMinHeight = 200; // Minimum expected menu height
        
        // Determine if menu should be positioned above or below
        // Position above if there's not enough space below AND more space above
        const shouldPositionAbove = spaceBelow < menuMinHeight + menuGap && spaceAbove > spaceBelow;
        
        // Calculate position relative to editor container
        let top: number;
        if (shouldPositionAbove) {
          // Position at cursor top - transform will flip it above
          top = coords.top - editorRect.top - menuGap;
        } else {
          // Position below cursor
          top = coords.bottom - editorRect.top + menuGap;
        }
        
        setSlashMenuPosition({
          top: Math.max(0, top), // Ensure it doesn't go above the container
          left: coords.left - editorRect.left, // Align with cursor position
        });
        setSlashMenuPositionAbove(shouldPositionAbove);
        
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

  // Add DOM-level spacebar interception
  useEffect(() => {
    if (!editor) return;
    
    const editorElement = editor.view.dom;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle spacebar
      if (e.key !== ' ' && e.key !== 'Spacebar') return;
      
      // Check if there's a space before the cursor
      const { state, dispatch } = editor.view;
      const { $from } = state.selection;
      const textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - 1),
        $from.parentOffset,
        undefined,
        '\ufffc'
      );
      
      // If there's a space or non-breaking space before, insert non-breaking space
      if (textBefore === ' ' || textBefore === '\u00A0') {
        console.log('🟢 [DEBUG DOM KeyDown] Spacebar after space, inserting nbsp');
        e.preventDefault();
        e.stopPropagation();
        
        const transaction = state.tr.insertText('\u00A0', $from.pos, $from.pos);
        dispatch(transaction);
        return;
      }
    };
    
    editorElement.addEventListener('keydown', handleKeyDown);
    
    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor]);

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
              console.log('🟢 [DEBUG Save Button] Save button clicked!');
              console.log('🟢 [DEBUG Save Button] Current isSaving state:', isSaving);
              
              if (isSaving) {
                console.log('🟡 [DEBUG Save Button] Already saving, returning early');
                return;
              }
              
              if (!editor || !onSave) {
                console.error('❌ [DEBUG Save Button] Editor or onSave missing!', { hasEditor: !!editor, hasOnSave: !!onSave });
                return;
              }

              console.log('🔵 [DEBUG Save Button] Setting isSaving to TRUE');
              setIsSaving(true);
              
              try {
                const json = editor.getJSON();
                console.log('🟢 [DEBUG Save Button] Got JSON from editor:', JSON.stringify(json, null, 2));
                console.log('🟢 [DEBUG Save Button] Calling onSave callback...');
                await onSave(json);
                console.log('🟢 [DEBUG Save Button] onSave callback completed');
              } catch (error) {
                console.error('❌ [DEBUG Save Button] Save error:', error);
                throw error;
              } finally {
                console.log('🔵 [DEBUG Save Button] Setting isSaving to FALSE');
                setIsSaving(false);
              }
            }}
            disabled={isSaving || !editor || !onSave}
            aria-busy={isSaving}
            className={`px-4 py-2 bg-[#CC561E] hover:bg-[#B84A17] text-white rounded-md transition-colors text-sm font-medium inline-flex items-center gap-2 ${
              isSaving ? 'opacity-75 cursor-wait' : ''
            } disabled:opacity-75 disabled:cursor-not-allowed`}
          >
            {isSaving && (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            )}
            <span>{isSaving ? "Saving..." : "Save"}</span>
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
        {editor && <DragHandle editor={editor} />}
        {editor && <TableBubbleMenu editor={editor} />}
        {editor && <TableControls editor={editor} />}
        {/* Slash Command Menu - positioned relative to editor container */}
        {editor && (
          <SlashCommandMenu
            editor={editor}
            isOpen={showSlashMenu}
            onClose={handleCloseSlashMenu}
            position={slashMenuPosition}
            positionAbove={slashMenuPositionAbove}
          />
        )}
      </div>
    </div>
  );
}

