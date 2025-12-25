"use client";

import { Editor } from "@tiptap/react";
import { useState, useEffect, useRef } from "react";

interface TableBubbleMenuProps {
  editor: Editor;
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [isTableCellActive, setIsTableCellActive] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  // Store cell positions when menu is opened to preserve them even if selection changes
  const storedCellPositionsRef = useRef<Array<{ pos: number; node: any }>>([]);

  // Use Tiptap's selection tracking to manage selectedCell class and button position
  useEffect(() => {
    if (!editor) return;

    const findCellElement = (): HTMLElement | null => {
      const { selection } = editor.state;
      const { $from } = selection;
      
      // Use Tiptap's DOM utilities to find the cell
      const domAtPos = editor.view.domAtPos($from.pos);
      let element = domAtPos.node as HTMLElement;
      
      // Traverse up to find TD or TH using Tiptap's DOM structure
      while (element && element !== editor.view.dom) {
        if (element.tagName === 'TD' || element.tagName === 'TH') {
          return element;
        }
        element = element.parentElement as HTMLElement;
      }
      
      return null;
    };

    const findAllSelectedCells = (): HTMLElement[] => {
      const selectedCells: HTMLElement[] = [];
      const { selection } = editor.state;
      const { $from, $to } = selection;
      
      // Check if selection is inside a table
      let tableNode = null;
      let tableStart = -1;
      
      // Find the table node
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === 'table') {
          tableNode = node;
          tableStart = $from.before(depth);
          break;
        }
      }
      
      if (!tableNode) return selectedCells;
      
      // Get all cells in the editor
      const allCells = editor.view.dom.querySelectorAll('td, th');
      
      allCells.forEach((cell) => {
        try {
          const cellElement = cell as HTMLElement;
          const cellStartPos = editor.view.posAtDOM(cellElement, 0);
          
          if (cellStartPos !== null && cellStartPos >= 0) {
            const $cellPos = editor.state.doc.resolve(cellStartPos);
            
            // Find the cell node
            for (let depth = $cellPos.depth; depth > 0; depth--) {
              const node = $cellPos.node(depth);
              if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                const cellNodeStart = $cellPos.before(depth) + 1;
                const cellNodeEnd = cellNodeStart + node.content.size;
                
                // Check if selection overlaps with this cell
                if ($from.pos < cellNodeEnd && $to.pos > cellNodeStart) {
                  selectedCells.push(cellElement);
                }
                break;
              }
            }
          }
        } catch (error) {
          // Skip cells that can't be processed
        }
      });
      
      return selectedCells;
    };

    const updateSelection = () => {
      // Check if we're in a table (either single cell or multi-cell selection)
      const { selection } = editor.state;
      const { $from } = selection;
      
      // Check if selection is inside a table
      let isInTable = false;
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === 'table') {
          isInTable = true;
          break;
        }
      }
      
      // Keep cell active if menu is open (to prevent button from disappearing)
      const isActive = isInTable && (editor.isActive('tableCell') || editor.isActive('tableHeader') || selection.from !== selection.to || showMenu);
      setIsTableCellActive(isActive);

      // Remove selectedCell class from all cells
      const allCells = editor.view.dom.querySelectorAll('td, th');
      allCells.forEach(cell => {
        cell.classList.remove('selectedCell');
      });

      if (isActive && isInTable) {
        // Find all selected cells (supports multi-cell selection)
        const selectedCells = findAllSelectedCells();
        
        if (selectedCells.length > 0) {
          // Add selectedCell class to all selected cells
          selectedCells.forEach(cellElement => {
            cellElement.classList.add('selectedCell');
          });
          
          // Update stored cell positions if menu is open
          if (showMenu) {
            const cellNodes: Array<{ pos: number; node: any }> = [];
            const { selection } = editor.state;
            const { $from, $to } = selection;
            
            const findCellAtPos = (pos: number) => {
              const $pos = editor.state.doc.resolve(pos);
              for (let depth = $pos.depth; depth > 0; depth--) {
                const node = $pos.node(depth);
                if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                  return { pos: $pos.before(depth), node };
                }
              }
              return null;
            };
            
            if ($from.pos === $to.pos) {
              const cell = findCellAtPos($from.pos);
              if (cell) cellNodes.push(cell);
            } else {
              const fromCell = findCellAtPos($from.pos);
              const toCell = findCellAtPos($to.pos);
              if (fromCell) cellNodes.push(fromCell);
              if (toCell && toCell.pos !== fromCell?.pos) cellNodes.push(toCell);
            }
            
            storedCellPositionsRef.current = cellNodes;
          }
          
          // Use the first selected cell for button positioning
          const firstCell = selectedCells[0];
          const rect = firstCell.getBoundingClientRect();
          
          // Position button on the right border, perfectly centered vertically
          setButtonPosition({
            top: Math.round(rect.top + rect.height / 2),
            left: Math.round(rect.right),
          });
          
          // Position menu below the cell
          setMenuPosition({
            top: Math.round(rect.bottom + 8),
            left: Math.round(rect.left),
          });
        } else {
          // Fallback to single cell selection
          const cellElement = findCellElement();
          
          if (cellElement) {
            cellElement.classList.add('selectedCell');
            
            // Update stored cell positions if menu is open
            if (showMenu) {
              const cellNodes: Array<{ pos: number; node: any }> = [];
              const { selection } = editor.state;
              const { $from } = selection;
              
              for (let depth = $from.depth; depth > 0; depth--) {
                const node = $from.node(depth);
                if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                  cellNodes.push({ pos: $from.before(depth), node });
                  break;
                }
              }
              
              storedCellPositionsRef.current = cellNodes;
            }
            
            const rect = cellElement.getBoundingClientRect();
            
            setButtonPosition({
              top: Math.round(rect.top + rect.height / 2),
              left: Math.round(rect.right),
            });
            
            setMenuPosition({
              top: Math.round(rect.bottom + 8),
              left: Math.round(rect.left),
            });
          }
        }
      } else {
        // Only close menu if it's not already open (to prevent closing when clicking button)
        if (!showMenu) {
        setShowMenu(false);
        setShowColorMenu(false);
        setShowAlignMenu(false);
        }
      }
    };

    // Use Tiptap's event system
    editor.on('selectionUpdate', updateSelection);
    editor.on('update', updateSelection);
    editor.on('transaction', updateSelection);
    
    // Also update on scroll/resize
    const handleUpdate = () => {
      if (isTableCellActive) {
        updateSelection();
      }
    };
    
    // Ensure selection persists after mouse release
    const handleMouseUp = () => {
      setTimeout(() => {
        updateSelection();
      }, 0);
    };
    
    const editorDom = editor.view.dom;
    editorDom.addEventListener('mouseup', handleMouseUp);
    
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    updateSelection();

    // Handle double-click on table cells to select them
    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest('td, th');
      
      if (cell && editor.view.dom.contains(cell)) {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          // Find the position of the cell in the editor
          const pos = editor.view.posAtDOM(cell, 0);
          
          if (pos !== null && pos >= 0) {
            // Get the resolved position
            const $pos = editor.state.doc.resolve(pos);
            
            // Find the table cell node by traversing up
            let cellDepth = -1;
            for (let depth = $pos.depth; depth > 0; depth--) {
              const node = $pos.node(depth);
              if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                cellDepth = depth;
                break;
              }
            }
            
            if (cellDepth > 0) {
              // Get the position right after the cell node starts
              const cellStart = $pos.before(cellDepth) + 1;
              const cellNode = $pos.node(cellDepth);
              const cellEnd = cellStart + cellNode.content.size;
              
              // Select the entire cell content
              editor.chain()
                .focus()
                .setTextSelection({ from: cellStart, to: cellEnd })
                .run();
              
              // Force update to ensure the selectedCell class is added
              requestAnimationFrame(() => {
                updateSelection();
              });
            } else {
              // Fallback: just place cursor in the cell
              editor.chain()
                .focus()
                .setTextSelection(pos)
                .run();
              
              requestAnimationFrame(() => {
                updateSelection();
              });
            }
          }
        } catch (error) {
          console.error('Error selecting cell on double-click:', error);
        }
      }
    };

    // Add double-click listener to the editor DOM
    editorDom.addEventListener('dblclick', handleDoubleClick);
    
    // Prevent text selection on cell click that causes bold appearance
    const handleCellClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest('td, th');
      
      if (cell && !cell.querySelector(':focus')) {
        // If clicking on a cell but not already focused, prevent default selection
        // This prevents the brief bold appearance from text selection
        if (window.getSelection() && window.getSelection()?.toString() === '') {
          // Only prevent if there's no existing selection
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
          }
        }
      }
    };
    
    editorDom.addEventListener('mousedown', handleCellClick, true);

    return () => {
      editor.off('selectionUpdate', updateSelection);
      editor.off('update', updateSelection);
      editor.off('transaction', updateSelection);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      editorDom.removeEventListener('mouseup', handleMouseUp);
      editorDom.removeEventListener('dblclick', handleDoubleClick);
      editorDom.removeEventListener('mousedown', handleCellClick, true);
    };
  }, [editor, isTableCellActive, showMenu]);

  // Show button when a cell is active (either from selection or double-click)
  if (!editor || !isTableCellActive) return null;

  const textColors = [
    { label: "Default text", value: null, class: "text-gray-900" },
    { label: "Gray text", value: "#6B7280", class: "text-gray-500" },
    { label: "Brown text", value: "#92400E", class: "text-yellow-900" },
    { label: "Orange text", value: "#C2410C", class: "text-orange-600" },
    { label: "Yellow text", value: "#A16207", class: "text-yellow-600" },
    { label: "Green text", value: "#15803D", class: "text-green-600" },
    { label: "Blue text", value: "#1D4ED8", class: "text-blue-600" },
    { label: "Purple text", value: "#7C3AED", class: "text-purple-600" },
    { label: "Pink text", value: "#DB2777", class: "text-pink-600" },
    { label: "Red text", value: "#DC2626", class: "text-red-600" },
  ];

  const backgroundColors = [
    { label: "Default background", value: null, class: "bg-white" },
    { label: "Gray background", value: "#F3F4F6", class: "bg-gray-100" },
    { label: "Brown background", value: "#FEF3C7", class: "bg-yellow-100" },
    { label: "Orange background", value: "#FFEDD5", class: "bg-orange-100" },
    { label: "Yellow background", value: "#FEF9C3", class: "bg-yellow-50" },
    { label: "Green background", value: "#DCFCE7", class: "bg-green-100" },
    { label: "Blue background", value: "#DBEAFE", class: "bg-blue-100" },
    { label: "Purple background", value: "#EDE9FE", class: "bg-purple-100" },
    { label: "Pink background", value: "#FCE7F3", class: "bg-pink-100" },
    { label: "Red background", value: "#FEE2E2", class: "bg-red-100" },
  ];

  const alignments = [
    { label: "Align left", value: "left" },
    { label: "Align center", value: "center" },
    { label: "Align right", value: "right" },
  ];

  const verticalAlignments = [
    { label: "Align top", value: "top" },
    { label: "Align middle", value: "middle" },
    { label: "Align bottom", value: "bottom" },
  ];

  // Helper function to find all selected cell nodes with their correct positions
  // Uses DOM to find cells with selectedCell class, which is more reliable
  const getSelectedCellNodes = (): Array<{ pos: number; node: any }> => {
    const cellNodes: Array<{ pos: number; node: any }> = [];
    const seenPositions = new Set<number>();

    // First, try to find cells using DOM (cells with selectedCell class)
    const selectedCells = editor.view.dom.querySelectorAll('td.selectedCell, th.selectedCell');
    
    selectedCells.forEach((cellElement) => {
      try {
        // Get the position of the cell in the document
        const pos = editor.view.posAtDOM(cellElement, 0);
        if (pos !== null && pos >= 0) {
          const $pos = editor.state.doc.resolve(pos);
          // Traverse up to find the cell node
          for (let depth = $pos.depth; depth > 0; depth--) {
            const node = $pos.node(depth);
            if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
              const nodePos = $pos.before(depth);
              if (!seenPositions.has(nodePos)) {
                cellNodes.push({ pos: nodePos, node });
                seenPositions.add(nodePos);
              }
              break;
            }
          }
        }
      } catch (error) {
        // Skip cells that can't be processed
      }
    });

    // Fallback: if no cells found via DOM, use selection-based approach
    if (cellNodes.length === 0) {
      const { selection } = editor.state;
      const { $from, $to } = selection;

      const findCellAtPos = (pos: number) => {
        const $pos = editor.state.doc.resolve(pos);
        for (let depth = $pos.depth; depth > 0; depth--) {
          const node = $pos.node(depth);
          if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
            const nodePos = $pos.before(depth);
            return { pos: nodePos, node };
          }
        }
        return null;
      };

      if ($from.pos === $to.pos) {
        const cell = findCellAtPos($from.pos);
        if (cell) {
          cellNodes.push(cell);
        }
      } else {
        const fromCell = findCellAtPos($from.pos);
        if (fromCell && !seenPositions.has(fromCell.pos)) {
          cellNodes.push(fromCell);
          seenPositions.add(fromCell.pos);
        }

        const toCell = findCellAtPos($to.pos);
        if (toCell && !seenPositions.has(toCell.pos)) {
          cellNodes.push(toCell);
          seenPositions.add(toCell.pos);
        }
      }
    }

    return cellNodes;
  };

  // Use Tiptap's transaction system to update cell attributes
  const setCellColor = (color: string | null, type: 'text' | 'background') => {
    console.log('🎨 setCellColor called:', { color, type });
    const attributeName = type === 'text' ? 'textColor' : 'backgroundColor';
    
    // Try multiple methods to find selected cells
    let selectedCells = editor.view.dom.querySelectorAll('td.selectedCell, th.selectedCell');
    console.log('🎨 Method 1 - DOM cells with selectedCell class:', selectedCells.length);
    
    // Fallback 1: Use stored cell positions if available
    if (selectedCells.length === 0 && storedCellPositionsRef.current.length > 0) {
      console.log('🎨 Method 2 - Using stored cell positions:', storedCellPositionsRef.current.length);
      const { tr } = editor.state;
      storedCellPositionsRef.current.forEach(({ pos, node }) => {
        try {
          console.log('🎨 Updating stored cell:', { pos, nodeType: node.type.name, currentAttrs: node.attrs });
          const newAttrs = {
            ...node.attrs,
            [attributeName]: color,
          };
          console.log('🎨 New attributes:', newAttrs);
          tr.setNodeMarkup(pos, node.type, newAttrs);
        } catch (error) {
          console.error('❌ Error using stored position:', error);
        }
      });
      
      if (tr.docChanged) {
        console.log('✅ Transaction has changes, dispatching...');
        editor.view.dispatch(tr);
        
        // Force a DOM update and verify styles are applied
        setTimeout(() => {
          // Find the cell in DOM and verify/inspect it
          if (storedCellPositionsRef.current.length > 0) {
            const { pos } = storedCellPositionsRef.current[0];
            try {
              const domAtPos = editor.view.domAtPos(pos + 1);
              let element = domAtPos.node as HTMLElement;
              while (element && element !== editor.view.dom) {
                if (element.tagName === 'TD' || element.tagName === 'TH') {
                  const currentStyle = element.getAttribute('style') || '';
                  const computedColor = window.getComputedStyle(element).color;
                  const nodeAfterUpdate = editor.state.doc.nodeAt(pos);
                  const expectedColor = nodeAfterUpdate?.attrs[attributeName];
                  
                  console.log('🔍 Cell DOM state after update:', {
                    tagName: element.tagName,
                    textContent: element.textContent?.substring(0, 50) || '(empty)',
                    inlineStyle: currentStyle,
                    computedColor,
                    expectedColor,
                    nodeAttrsAfterUpdate: nodeAfterUpdate?.attrs,
                    hasColorInStyle: currentStyle.includes('color'),
                    hasImportant: currentStyle.includes('!important'),
                    attributeName,
                    type,
                    cellHasContent: element.textContent && element.textContent.trim().length > 0,
                  });
                  
                  // Helper to convert hex to RGB for comparison
                  const hexToRgb = (hex: string): string | null => {
                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result
                      ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
                      : null;
                  };
                  
                  // If style is missing or incorrect, force it directly to DOM
                  if (expectedColor) {
                    const expectedRgb = hexToRgb(expectedColor);
                    const colorMatches = expectedRgb && computedColor.toLowerCase() === expectedRgb.toLowerCase();
                    
    if (type === 'text') {
                      // Check if color is in style AND computed color matches
                      if (!currentStyle.includes('color') || !colorMatches) {
                        if (!colorMatches) {
                          console.warn('⚠️ Text color mismatch, forcing application...', {
                            expected: expectedColor,
                            expectedRgb,
                            computed: computedColor,
                          });
                        }
                        element.style.setProperty('color', expectedColor, 'important');
                        console.log('✅ Forced text color to DOM:', expectedColor);
                      } else {
                        console.log('✅ Text color correctly applied');
                        // Double-check: ensure it's really there
                        const finalStyle = element.getAttribute('style');
                        const finalComputed = window.getComputedStyle(element).color;
                        const cellText = element.textContent?.trim() || '';
                        
                        console.log('✅ Final verification:', {
                          styleAttribute: finalStyle,
                          computedColor: finalComputed,
                          cellText: cellText || '(empty cell - color will show when you type)',
                          cellHasContent: cellText.length > 0,
                        });
                        
                        // If cell is empty, add a placeholder or ensure color is visible
                        // The color will be visible when user types in the cell
                        if (!cellText) {
                          console.info('ℹ️ Cell is empty. The color will be visible when you type text in the cell.');
                        }
                      }
                    } else {
                      const computedBg = window.getComputedStyle(element).backgroundColor;
                      const bgMatches = expectedRgb && computedBg.toLowerCase() === expectedRgb.toLowerCase();
                      
                      if (!currentStyle.includes('background-color') || !bgMatches) {
                        if (!bgMatches) {
                          console.warn('⚠️ Background color mismatch, forcing application...', {
                            expected: expectedColor,
                            expectedRgb,
                            computed: computedBg,
                          });
                        }
                        element.style.setProperty('background-color', expectedColor, 'important');
                      } else {
                        console.log('✅ Background color correctly applied');
                      }
                    }
                  }
                  break;
                }
                element = element.parentElement as HTMLElement;
              }
            } catch (error) {
              console.error('Error inspecting DOM:', error);
            }
          }
          editor.chain().focus().run();
        }, 50);
      } else {
        console.warn('⚠️ Transaction has no changes');
      }
      setShowColorMenu(false);
      return;
    }
    
    // Fallback 2: Use editor selection to find the cell
    if (selectedCells.length === 0) {
      console.log('🎨 Method 3 - Using editor selection');
      const { selection } = editor.state;
      const { $from } = selection;
      console.log('🎨 Selection:', { from: $from.pos, depth: $from.depth });
      
      // Find the cell node from the current selection
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        console.log(`🎨 Checking depth ${depth}:`, { nodeType: node.type.name });
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          const pos = $from.before(depth);
          console.log('🎨 Found cell node:', { pos, nodeType: node.type.name, currentAttrs: node.attrs });
          const { tr } = editor.state;
          const newAttrs = {
            ...node.attrs,
            [attributeName]: color,
          };
          console.log('🎨 New attributes:', newAttrs);
          tr.setNodeMarkup(pos, node.type, newAttrs);
          
          if (tr.docChanged) {
            console.log('✅ Transaction has changes, dispatching...');
            editor.view.dispatch(tr);
            setTimeout(() => editor.chain().focus().run(), 10);
          } else {
            console.warn('⚠️ Transaction has no changes');
          }
          setShowColorMenu(false);
          return;
        }
      }
      
      console.warn('❌ No selected cells found and could not find cell from selection');
      setShowColorMenu(false);
      return;
    }

    console.log('🎨 Method 1 - Processing DOM cells:', selectedCells.length);
    const { tr } = editor.state;
    let hasChanges = false;

    selectedCells.forEach((cellElement, index) => {
      try {
        const cell = cellElement as HTMLElement;
        console.log(`🎨 Processing cell ${index + 1}:`, {
          tagName: cell.tagName,
          textContent: cell.textContent?.substring(0, 30),
        });
        
        // Get the position of the cell in the document
        const cellPos = editor.view.posAtDOM(cell, 0);
        console.log(`🎨 Cell position:`, cellPos);
        
        if (cellPos === null || cellPos < 0) {
          console.warn('⚠️ Could not get position for cell');
          return;
        }

        // Resolve the position to find the cell node
        const $pos = tr.doc.resolve(cellPos);
        console.log(`🎨 Resolved position depth:`, $pos.depth);
        
        // Traverse up to find the table cell node
        for (let depth = $pos.depth; depth > 0; depth--) {
          const node = $pos.node(depth);
          console.log(`🎨 Checking depth ${depth}:`, { nodeType: node.type.name });
          if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
            // Get the position before this node (required for setNodeMarkup)
            const nodePos = $pos.before(depth);
            console.log(`🎨 Found cell node at position:`, nodePos, {
              nodeType: node.type.name,
              currentAttrs: node.attrs,
            });
            
            // Create new attributes with the updated color
            const newAttrs = {
              ...node.attrs,
              [attributeName]: color,
            };
            console.log(`🎨 New attributes:`, newAttrs);
            
            // Update the node
            tr.setNodeMarkup(nodePos, node.type, newAttrs);
            hasChanges = true;
            console.log(`✅ Updated cell ${index + 1}`);
            break;
          }
        }
      } catch (error) {
        console.error('❌ Error setting cell color:', error);
      }
    });
    
    console.log('🎨 Final check:', { hasChanges, docChanged: tr.docChanged });
    if (hasChanges && tr.docChanged) {
      console.log('✅ Dispatching transaction...');
      editor.view.dispatch(tr);
      // Small delay to ensure the DOM updates
      setTimeout(() => {
        editor.chain().focus().run();
      }, 10);
    } else {
      console.warn('⚠️ No changes to dispatch:', { hasChanges, docChanged: tr.docChanged });
    }
    
    setShowColorMenu(false);
  };

  const setCellAlignment = (align: string, type: 'horizontal' | 'vertical') => {
    const attributeName = type === 'horizontal' ? 'textAlign' : 'verticalAlign';
    
    // Try multiple methods to find selected cells
    let selectedCells = editor.view.dom.querySelectorAll('td.selectedCell, th.selectedCell');
    
    // Fallback 1: Use stored cell positions if available
    if (selectedCells.length === 0 && storedCellPositionsRef.current.length > 0) {
      const { tr } = editor.state;
      storedCellPositionsRef.current.forEach(({ pos, node }) => {
        try {
          const newAttrs = {
            ...node.attrs,
            [attributeName]: align,
          };
          tr.setNodeMarkup(pos, node.type, newAttrs);
        } catch (error) {
          console.error('Error using stored position:', error);
        }
      });
      
      if (tr.docChanged) {
        editor.view.dispatch(tr);
        setTimeout(() => editor.chain().focus().run(), 10);
      }
      setShowAlignMenu(false);
      return;
    }
    
    // Fallback 2: Use editor selection to find the cell
    if (selectedCells.length === 0) {
      const { selection } = editor.state;
      const { $from } = selection;
      
      // Find the cell node from the current selection
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          const pos = $from.before(depth);
          const { tr } = editor.state;
          const newAttrs = {
            ...node.attrs,
            [attributeName]: align,
          };
          tr.setNodeMarkup(pos, node.type, newAttrs);
          
          if (tr.docChanged) {
            editor.view.dispatch(tr);
            setTimeout(() => editor.chain().focus().run(), 10);
          }
          setShowAlignMenu(false);
          return;
        }
      }
      
      console.warn('No selected cells found and could not find cell from selection');
      setShowAlignMenu(false);
      return;
    }

    const { tr } = editor.state;
    let hasChanges = false;

    selectedCells.forEach((cellElement) => {
      try {
        const cell = cellElement as HTMLElement;
        // Get the position of the cell in the document
        const cellPos = editor.view.posAtDOM(cell, 0);
        
        if (cellPos === null || cellPos < 0) {
          console.warn('Could not get position for cell');
          return;
        }

        // Resolve the position to find the cell node
        const $pos = tr.doc.resolve(cellPos);
        
        // Traverse up to find the table cell node
        for (let depth = $pos.depth; depth > 0; depth--) {
          const node = $pos.node(depth);
          if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
            // Get the position before this node (required for setNodeMarkup)
            const nodePos = $pos.before(depth);
            
            // Create new attributes with the updated alignment
            const newAttrs = {
              ...node.attrs,
              [attributeName]: align,
            };
            
            // Update the node
            tr.setNodeMarkup(nodePos, node.type, newAttrs);
            hasChanges = true;
            break;
          }
        }
      } catch (error) {
        console.error('Error setting cell alignment:', error);
      }
    });
    
    if (hasChanges && tr.docChanged) {
      editor.view.dispatch(tr);
      // Small delay to ensure the DOM updates
      setTimeout(() => {
        editor.chain().focus().run();
      }, 10);
    }
    
    setShowAlignMenu(false);
  };

  return (
    <>
      {/* Handle Button - positioned on right border using fixed positioning */}
      {!showMenu && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Prevent the click from changing editor selection
            // Store the current selection before opening menu
            const { selection } = editor.state;
            const { $from } = selection;
            
            // Store cell positions before opening menu
            const cellNodes = getSelectedCellNodes();
            storedCellPositionsRef.current = cellNodes;
            
            // If no cells found, try to find from current selection
            if (cellNodes.length === 0) {
              for (let depth = $from.depth; depth > 0; depth--) {
                const node = $from.node(depth);
                if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                  const pos = $from.before(depth);
                  cellNodes.push({ pos, node });
                  storedCellPositionsRef.current = cellNodes;
                  break;
                }
              }
            }
            
            // Ensure the selectedCell class is maintained
            const domCells = editor.view.dom.querySelectorAll('td.selectedCell, th.selectedCell');
            if (domCells.length === 0 && cellNodes.length > 0) {
              // Re-add the selectedCell class if it was lost
              try {
                const { pos } = cellNodes[0];
                const domAtPos = editor.view.domAtPos(pos + 1);
                let element = domAtPos.node as HTMLElement;
                while (element && element !== editor.view.dom) {
                  if (element.tagName === 'TD' || element.tagName === 'TH') {
                    element.classList.add('selectedCell');
                    break;
                  }
                  element = element.parentElement as HTMLElement;
                }
              } catch (error) {
                console.error('Error maintaining selectedCell class:', error);
              }
            }
            
            // Log which cell this bubble menu is for
            console.log('🔵 Bubble Menu Opened:', {
              cellCount: cellNodes.length,
              cells: cellNodes.map(({ pos, node }) => ({
                position: pos,
                nodeType: node.type.name,
                currentAttrs: node.attrs,
              })),
              storedPositions: storedCellPositionsRef.current.length,
            });
            
            // Also log the DOM cells
            const finalDomCells = editor.view.dom.querySelectorAll('td.selectedCell, th.selectedCell');
            console.log('🔵 DOM Selected Cells:', {
              count: finalDomCells.length,
              cells: Array.from(finalDomCells).map(cell => ({
                tagName: cell.tagName,
                textContent: (cell as HTMLElement).textContent?.substring(0, 50),
                hasSelectedClass: cell.classList.contains('selectedCell'),
              })),
            });
            
            setShowMenu(true);
          }}
          onMouseDown={(e) => {
            // Prevent mousedown from changing selection
            e.preventDefault();
            e.stopPropagation();
          }}
          className="table-bubble-menu-button fixed border border-white rounded-full shadow-lg transition-colors z-50 flex items-center justify-center"
          style={{
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            padding: '4px',
            backgroundColor: '#CC561E',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#B84A17';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#CC561E';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="3" cy="3" r="1" fill="white" />
            <circle cx="9" cy="3" r="1" fill="white" />
            <circle cx="3" cy="9" r="1" fill="white" />
            <circle cx="9" cy="9" r="1" fill="white" />
          </svg>
        </button>
      )}

      {/* Full Menu */}
      {showMenu && (
        <>
          <div 
            className="fixed bg-white rounded-lg shadow-xl border border-gray-200 p-2 flex items-center gap-1 z-50"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Color Menu */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
                onClick={() => {
                  setShowColorMenu(!showColorMenu);
                  setShowAlignMenu(false);
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Color
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showColorMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowColorMenu(false)} />
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 w-64">
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Text Color</p>
                      <div className="space-y-1">
                        {textColors.map((color) => (
                          <button
                            key={color.label}
                            type="button"
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded flex items-center gap-2 text-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCellColor(color.value, 'text');
                            }}
                          >
                            <span className={`font-semibold ${color.class}`}>A</span>
                            {color.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Background Color</p>
                      <div className="space-y-1">
                        {backgroundColors.map((color) => (
                          <button
                            key={color.label}
                            type="button"
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded flex items-center gap-2 text-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCellColor(color.value, 'background');
                            }}
                          >
                            <span className={`w-4 h-4 rounded border ${color.class}`}></span>
                            {color.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-6 bg-gray-200" />

            {/* Alignment Menu */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
                onClick={() => {
                  setShowAlignMenu(!showAlignMenu);
                  setShowColorMenu(false);
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                </svg>
                Alignment
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAlignMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAlignMenu(false)} />
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 w-48">
                    <div className="space-y-1">
                      {alignments.map((align) => (
                        <button
                          key={align.value}
                          type="button"
                          className={`w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-2 ${
                            align.value === 'left' ? 'bg-gray-100' : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCellAlignment(align.value, 'horizontal');
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d={align.value === 'left' ? "M4 6h16M4 12h10M4 18h16" : 
                                 align.value === 'center' ? "M4 6h16M7 12h10M4 18h16" : 
                                 "M4 6h16M10 12h10M4 18h16"} />
                          </svg>
                          {align.label}
                        </button>
                      ))}
                    </div>
                    <div className="border-t mt-2 pt-2 space-y-1">
                      {verticalAlignments.map((align) => (
                        <button
                          key={align.value}
                          type="button"
                          className={`w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-2 ${
                            align.value === 'top' ? 'bg-gray-100' : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCellAlignment(align.value, 'vertical');
                          }}
                        >
                          <span className="text-lg">{align.value === 'top' ? '↑' : align.value === 'middle' ? '↕' : '↓'}</span>
                          {align.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Close button */}
            <button
              type="button"
              className="ml-2 p-2 hover:bg-gray-100 rounded-md text-gray-500"
              onClick={() => {
                setShowMenu(false);
                setShowColorMenu(false);
                setShowAlignMenu(false);
                storedCellPositionsRef.current = [];
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Backdrop to close menu when clicking outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setShowMenu(false);
              setShowColorMenu(false);
              setShowAlignMenu(false);
              storedCellPositionsRef.current = [];
            }}
          />
        </>
      )}
    </>
  );
}
