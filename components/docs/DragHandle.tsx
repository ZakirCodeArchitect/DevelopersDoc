"use client";

import { Editor } from "@tiptap/react";
import { useEffect, useState, useRef } from "react";

interface DragHandleProps {
  editor: Editor;
}

export function DragHandle({ editor }: DragHandleProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<HTMLElement | null>(null);
  const [draggedNodePos, setDraggedNodePos] = useState<number | null>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;
    let currentHoveredElement: HTMLElement | null = null;
    let draggedNode: HTMLElement | null = null;
    let draggedNodePos: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // If hovering over the drag handle itself, keep it visible
      if (target.closest(".drag-handle")) {
        if (hoveredNode) {
          // Keep the handle visible and update position if needed
          const rect = hoveredNode.getBoundingClientRect();
          const editorRect = editorElement.getBoundingClientRect();
          const editorPadding = 32;
          setPosition({
            top: rect.top - editorRect.top + rect.height / 2 - 14,
            left: editorPadding - 24,
          });
          setVisible(true);
        }
        return;
      }

      if (!target || !editorElement.contains(target)) {
        // Only hide if not hovering over the handle
        if (!target?.closest(".drag-handle")) {
          setVisible(false);
          setHoveredNode(null);
        }
        return;
      }

      // Find the closest block element
      let blockElement = target.closest(
        "p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table, hr, img, li"
      ) as HTMLElement;

      if (blockElement && editorElement.contains(blockElement)) {
        // Only allow drag and drop for tables - disable everything else
        if (blockElement.tagName !== 'TABLE') {
          setVisible(false);
          setHoveredNode(null);
          return;
        }

        if (currentHoveredElement !== blockElement) {
          currentHoveredElement = blockElement;
          setHoveredNode(blockElement);

          const rect = blockElement.getBoundingClientRect();
          const editorRect = editorElement.getBoundingClientRect();
          // Account for editor padding (px-8 = 32px)
          const editorPadding = 32;

          setPosition({
            top: rect.top - editorRect.top + rect.height / 2 - 14,
            left: editorPadding - 24, // Position just to the left of content
          });
          setVisible(true);
        }
      } else {
        // Only hide if not hovering over the handle
        if (!target?.closest(".drag-handle")) {
          setVisible(false);
          setHoveredNode(null);
        }
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      // Don't hide if mouse is moving to the drag handle
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (relatedTarget?.closest(".drag-handle")) {
        return;
      }
      
      if (!draggedNode) {
        setVisible(false);
        setHoveredNode(null);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest(".drag-handle") && hoveredNode) {
        e.preventDefault();
        console.log("🔵 Drag handle clicked", { hoveredNode, target });
        draggedNode = hoveredNode;
        
        // Get the position of the node in the editor
        const pos = editor.view.posAtDOM(hoveredNode, 0);
        console.log("🔵 Position at DOM:", pos);
        if (pos !== null) {
          draggedNodePos = pos;
          setDraggedNodePos(pos);
          hoveredNode.style.opacity = "0.5";
          hoveredNode.style.cursor = "grabbing";
          console.log("🔵 Drag started, draggedNodePos set to:", pos);
        } else {
          console.error("❌ Failed to get position from DOM");
        }
      }
    };

    const handleMouseUp = () => {
      if (draggedNode) {
        draggedNode.style.opacity = "1";
        draggedNode.style.cursor = "";
        draggedNode = null;
        draggedNodePos = null;
        setDraggedNodePos(null);
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest(".drag-handle") || !hoveredNode) {
        console.log("🟡 DragStart skipped", { hasTarget: !!target, isDragHandle: !!target?.closest(".drag-handle"), hasHoveredNode: !!hoveredNode });
        return;
      }

      // Only allow drag and drop for tables - disable everything else
      if (!hoveredNode || hoveredNode.tagName !== 'TABLE') {
        console.log("🟡 Drag/drop disabled - only tables are allowed");
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      console.log("🟡 DragStart event triggered", { hoveredNode, draggedNodePos });
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "");
      }

      const pos = editor.view.posAtDOM(hoveredNode, 0);
      console.log("🟡 Position at DOM in dragStart:", pos);
      if (pos !== null) {
        draggedNodePos = pos;
        setDraggedNodePos(pos);
        hoveredNode.style.opacity = "0.5";
        console.log("🟡 draggedNodePos updated to:", pos);
      } else {
        console.error("❌ Failed to get position in dragStart");
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (!draggedNodePos) return;
      
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }

      const target = e.target as HTMLElement;
      const blockElement = target.closest(
        "p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table, hr, img, li"
      ) as HTMLElement;

      // Remove previous indicators
      editorElement
        .querySelectorAll(".drag-drop-indicator")
        .forEach((el) => el.remove());

      if (blockElement && blockElement !== hoveredNode) {
        const rect = blockElement.getBoundingClientRect();
        const shouldInsertBefore = e.clientY < rect.top + rect.height / 2;

        // Create indicator
        const indicator = document.createElement("div");
        indicator.className = "drag-drop-indicator";
        indicator.style.position = "absolute";
        indicator.style.left = "0";
        indicator.style.right = "0";
        indicator.style.height = "2px";
        indicator.style.backgroundColor = "#CC561E";
        indicator.style.zIndex = "1000";
        indicator.style.pointerEvents = "none";

        const editorRect = editorElement.getBoundingClientRect();
        indicator.style.top = `${shouldInsertBefore ? rect.top - editorRect.top : rect.bottom - editorRect.top}px`;

        editorElement.style.position = "relative";
        editorElement.appendChild(indicator);
      }
    };

    const handleDragLeave = () => {
      editorElement
        .querySelectorAll(".drag-drop-indicator")
        .forEach((el) => el.remove());
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("🟢 Drop event triggered", { draggedNode, hoveredNode, draggedNodePos });

      // Remove indicators
      editorElement
        .querySelectorAll(".drag-drop-indicator")
        .forEach((el) => el.remove());

      // Use the stored draggedNodePos or get it from hoveredNode
      const currentDraggedNode = draggedNode || hoveredNode;
      console.log("🟢 Current dragged node:", currentDraggedNode);
      if (!currentDraggedNode) {
        console.error("❌ No dragged node found!");
        return;
      }

      // Only allow drag and drop for tables - disable everything else
      if (!currentDraggedNode || currentDraggedNode.tagName !== 'TABLE') {
        console.log("🟡 Drag/drop disabled - only tables are allowed");
        if (currentDraggedNode) {
          currentDraggedNode.style.opacity = "1";
        }
        return;
      }

      const target = e.target as HTMLElement;
      let dropBlock = target.closest(
        "p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table, hr, img, li"
      ) as HTMLElement;

      console.log("🟢 Drop target:", { target, dropBlock, currentDraggedNode });

      if (!dropBlock || dropBlock === currentDraggedNode) {
        console.log("🟡 Drop cancelled: no drop block or same as dragged", { dropBlock, currentDraggedNode });
        if (currentDraggedNode) {
          currentDraggedNode.style.opacity = "1";
        }
        return;
      }

      const rect = dropBlock.getBoundingClientRect();
      const shouldInsertBefore = e.clientY < rect.top + rect.height / 2;
      console.log("🟢 Drop position:", { shouldInsertBefore, clientY: e.clientY, rectTop: rect.top, rectHeight: rect.height });

      // Get positions using DOM - only for tables
      let draggedPos: number | null = null;
      let dropPos: number | null = null;
      
      // For tables, use the standard approach
      draggedPos = editor.view.posAtDOM(currentDraggedNode, 0);
      dropPos = editor.view.posAtDOM(dropBlock, 0);
      
      // Fallback: if that didn't work, try getting position from the first child
      if (draggedPos === null && currentDraggedNode.firstChild) {
        draggedPos = editor.view.posAtDOM(currentDraggedNode.firstChild as Node, 0);
      }
      if (dropPos === null && dropBlock.firstChild) {
        dropPos = editor.view.posAtDOM(dropBlock.firstChild as Node, 0);
      }
      
      // If still null, try using coordinates
      if (draggedPos === null) {
        const rect = currentDraggedNode.getBoundingClientRect();
        const coords = editor.view.posAtCoords({ left: rect.left, top: rect.top });
        draggedPos = coords?.pos ?? null;
      }
      if (dropPos === null) {
        const rect = dropBlock.getBoundingClientRect();
        const coords = editor.view.posAtCoords({ left: rect.left, top: rect.top });
        dropPos = coords?.pos ?? null;
      }
      
      // Fallback: if that didn't work, try getting position from the first child
      if (draggedPos === null && currentDraggedNode.firstChild) {
        draggedPos = editor.view.posAtDOM(currentDraggedNode.firstChild as Node, 0);
      }
      if (dropPos === null && dropBlock.firstChild) {
        dropPos = editor.view.posAtDOM(dropBlock.firstChild as Node, 0);
      }
      
      // If still null, try using coordinates
      if (draggedPos === null) {
        const rect = currentDraggedNode.getBoundingClientRect();
        const coords = editor.view.posAtCoords({ left: rect.left, top: rect.top });
        draggedPos = coords?.pos ?? null;
      }
      if (dropPos === null) {
        const rect = dropBlock.getBoundingClientRect();
        const coords = editor.view.posAtCoords({ left: rect.left, top: rect.top });
        dropPos = coords?.pos ?? null;
      }
      
      console.log("🟢 Initial positions from DOM:", { draggedPos, dropPos, draggedNode: currentDraggedNode.tagName, dropNode: dropBlock.tagName });
      
      if (draggedPos === null || dropPos === null) {
        console.error("❌ Failed to get positions", { draggedPos, dropPos });
        if (currentDraggedNode) {
          currentDraggedNode.style.opacity = "1";
        }
        return;
      }

      const { state } = editor;
      const $dragged = state.doc.resolve(draggedPos);
      const $drop = state.doc.resolve(dropPos);
      
      console.log("🟢 Resolved positions:", { 
        draggedDepth: $dragged.depth, 
        dropDepth: $drop.depth,
        draggedNodeType: $dragged.node($dragged.depth).type.name,
        dropNodeType: $drop.node($drop.depth).type.name,
        draggedPos,
        dropPos
      });
      
      // Find the actual block node that the DOM element represents
      let draggedBlockNode = null;
      let draggedFrom = 0;
      let draggedTo = 0;
      
      // Only handle tables - find the table node in the document structure
      // Walk up to find the doc node and get the block index
      // (We've already verified it's a table at the start of handleDrop)
      
      // If not found yet, use the standard method for tables
      if (!draggedBlockNode) {
        // Find the top-level block node (direct child of doc)
        // Walk up to find the doc node and get the block index
        for (let depth = $dragged.depth; depth >= 0; depth--) {
          const nodeAtDepth = $dragged.node(depth);
          console.log(`🟢 Checking depth ${depth}:`, { type: nodeAtDepth.type.name, isDoc: nodeAtDepth.type.name === 'doc' });
          
          if (nodeAtDepth.type.name === 'doc') {
            // Found doc, get the block that contains our position
            const blockDepth = depth - 1;
            if (blockDepth >= 0) {
              const blockIndex = $dragged.index(blockDepth);
              console.log(`🟢 Found doc at depth ${depth}, blockDepth: ${blockDepth}, blockIndex: ${blockIndex}`);
              
              if (blockIndex >= 0 && blockIndex < nodeAtDepth.childCount) {
                const targetNode = nodeAtDepth.child(blockIndex);
                // Only handle tables
                if (targetNode.type.name === 'table') {
                  draggedBlockNode = targetNode;
                  draggedFrom = $dragged.start(blockDepth);
                  draggedTo = draggedFrom + draggedBlockNode.nodeSize;
                  
                  console.log("🟢 Found dragged table block:", {
              type: draggedBlockNode.type.name, 
              from: draggedFrom, 
              to: draggedTo,
                    nodeSize: draggedBlockNode.nodeSize
            });
            break;
                }
              }
          }
        }
      }
      
      // Fallback: if we didn't find it by walking up, try to find it directly
      if (!draggedBlockNode) {
        console.log("🟡 Trying fallback method to find dragged block...");
        // Try to find the block node at the current depth
        if ($dragged.depth > 0) {
          const nodeAtDepth = $dragged.node($dragged.depth);
            // Check if this is a table node
            if (nodeAtDepth.isBlock && nodeAtDepth.type.name === 'table') {
            draggedBlockNode = nodeAtDepth;
            draggedFrom = $dragged.start($dragged.depth);
            draggedTo = draggedFrom + draggedBlockNode.nodeSize;
              console.log("🟢 Found dragged table block (fallback):", {
              depth: $dragged.depth,
              type: draggedBlockNode.type.name, 
              from: draggedFrom, 
              to: draggedTo
            });
            }
          }
        }
      }
      
      if (!draggedBlockNode) {
        console.error("❌ Failed to find dragged block node", {
          draggedPos,
          depth: $dragged.depth,
          nodeAtDepth: $dragged.node($dragged.depth)?.type.name,
          currentDraggedNode: currentDraggedNode?.tagName
        });
        if (currentDraggedNode) {
          currentDraggedNode.style.opacity = "1";
        }
        return;
      }
      
      console.log("🟢 Resolved positions:", { 
        draggedDepth: $dragged.depth, 
        dropDepth: $drop.depth,
        draggedNodeType: $dragged.node($dragged.depth).type.name,
        dropNodeType: $drop.node($drop.depth).type.name
      });

      // Find the top-level block node for drop target (direct child of doc)
      let dropFrom = 0;
      let dropTo = 0;
      let dropNode = null;
      
      // Walk up to find the doc node
      for (let depth = $drop.depth; depth >= 0; depth--) {
        const nodeAtDepth = $drop.node(depth);
        if (nodeAtDepth.type.name === 'doc') {
          // Found doc, get the block that contains our position
          const blockDepth = depth - 1;
          if (blockDepth >= 0) {
            const blockIndex = $drop.index(blockDepth);
            if (blockIndex >= 0 && blockIndex < nodeAtDepth.childCount) {
              dropNode = nodeAtDepth.child(blockIndex);
              // Get the absolute position of this block in the document
              dropFrom = $drop.start(blockDepth);
              dropTo = dropFrom + dropNode.nodeSize;
              console.log("🟢 Found drop block:", { 
                depth,
                blockDepth,
                blockIndex,
                type: dropNode.type.name, 
                from: dropFrom, 
                to: dropTo,
                nodeSize: dropNode.nodeSize
              });
              break;
            }
          }
        }
      }

      // Don't move if it's the same position
      const insertPos = shouldInsertBefore ? dropFrom : dropTo;
      if (draggedFrom === insertPos || (insertPos > draggedFrom && insertPos < draggedTo)) {
        console.log("🟡 Drop cancelled: same position", { draggedFrom, insertPos, draggedTo });
        if (currentDraggedNode) {
          currentDraggedNode.style.opacity = "1";
        }
        return;
      }

      // Validate the node we're about to delete matches what we expect
      // For lists, verify we have the complete list container by checking the node at the start position
      if (draggedBlockNode.type.name === 'orderedList' || draggedBlockNode.type.name === 'bulletList') {
        // Verify we're deleting from a position that's the start of a list container
        // Find the list container as a direct child of doc at this position
        let verifiedListStart = -1;
        let verifiedListEnd = -1;
        let verifiedListNode = null;
        
        let currentPos = 1; // Start after doc opening
        for (let i = 0; i < state.doc.childCount; i++) {
          const child = state.doc.child(i);
          const childStart = currentPos;
          const childEnd = childStart + child.nodeSize;
          
          // Check if the dragged position is within this list container
          // Use exact match OR range check to be more robust
          if ((child.type.name === 'orderedList' || child.type.name === 'bulletList') && 
              (draggedFrom === childStart || (draggedFrom >= childStart && draggedFrom < childEnd))) {
            // Always use the exact boundaries from doc children for the complete list
            verifiedListStart = childStart;
            verifiedListEnd = childEnd;
            verifiedListNode = child;
            console.log("🟢 Verified list container to delete:", {
              index: i,
              type: child.type.name,
              from: verifiedListStart,
              to: verifiedListEnd,
              nodeSize: child.nodeSize,
              originalFrom: draggedFrom,
              originalTo: draggedTo,
              draggedFromMatches: draggedFrom === childStart
            });
            break;
          }
          currentPos = childEnd;
        }
        
        // If verification found a different list, use those boundaries
        if (verifiedListNode && verifiedListStart >= 0) {
          draggedFrom = verifiedListStart;
          draggedTo = verifiedListEnd;
          draggedBlockNode = verifiedListNode;
          console.log("🟢 Using verified list boundaries:", {
            from: draggedFrom,
            to: draggedTo,
            nodeSize: draggedBlockNode.nodeSize,
            type: draggedBlockNode.type.name
          });
        } else {
          console.warn("⚠️ Could not verify list container at position", draggedFrom);
          // Double-check by resolving the position
          const $deletePos = state.doc.resolve(draggedFrom);
          const nodeAtPos = state.doc.nodeAt(draggedFrom);
          
          if (nodeAtPos && (nodeAtPos.type.name === 'orderedList' || nodeAtPos.type.name === 'bulletList')) {
            // Use the node at this position
            draggedTo = draggedFrom + nodeAtPos.nodeSize;
            draggedBlockNode = nodeAtPos;
            console.log("🟢 Adjusted list boundaries from nodeAtPos:", {
              from: draggedFrom,
              to: draggedTo,
              nodeSize: nodeAtPos.nodeSize
            });
          }
        }
      }
      
      // Get the JSON representation and create node to insert
      const nodeJSON = draggedBlockNode.toJSON();
      console.log("🟢 Node JSON:", nodeJSON);
      const nodeToInsert = state.schema.nodeFromJSON(nodeJSON);
      
      // Calculate the node size (after potential adjustments)
      const nodeSize = draggedTo - draggedFrom;
      
      console.log("🟢 Position calculation:", { 
        insertPos, 
        draggedFrom, 
        draggedTo, 
        nodeSize,
        insertingAfter: insertPos > draggedTo,
        insertingBefore: insertPos <= draggedFrom,
        shouldInsertBefore
      });
      
      // Calculate the adjusted drop position BEFORE deletion
      // This accounts for the fact that the dragged node will be deleted
      let adjustedDropPos = dropPos;
      
      if (dropPos > draggedTo) {
        // Drop position is after the dragged node, so after deletion it shifts left
        adjustedDropPos = dropPos - nodeSize;
      } else if (dropPos < draggedFrom) {
        // Drop position is before the dragged node, so it stays the same
        adjustedDropPos = dropPos;
      } else {
        // Drop position is inside the dragged node (shouldn't happen, but handle it)
        adjustedDropPos = draggedFrom;
      }
      
      console.log("🟢 Adjusted drop position for deletion:", {
        originalDropPos: dropPos,
        adjustedDropPos,
        draggedFrom,
        draggedTo,
        nodeSize,
        dropPosAfterDragged: dropPos > draggedTo,
        dropPosBeforeDragged: dropPos < draggedFrom
      });
      
      try {
        // Final verification: check what node we're about to delete
        const $beforeDelete = state.doc.resolve(draggedFrom);
        
        console.log("🟢 About to delete:", {
          from: draggedFrom,
          to: draggedTo,
          nodeType: draggedBlockNode.type.name,
          nodeSize: draggedBlockNode.nodeSize,
          depth: $beforeDelete.depth
        });
        
        // For lists, do a final check that we're deleting a complete list container
        if (draggedBlockNode.type.name === 'orderedList' || draggedBlockNode.type.name === 'bulletList') {
          // Walk up from the resolved position to find the list container
          // nodeAt() might return a child node, so we need to walk up
          let foundListContainer = false;
          for (let depth = $beforeDelete.depth; depth >= 0; depth--) {
            const nodeAtDepth = $beforeDelete.node(depth);
            if (nodeAtDepth.type.name === 'orderedList' || nodeAtDepth.type.name === 'bulletList') {
              // Check if this is a direct child of doc (depth should be 0 relative to doc)
              if (depth > 0 && $beforeDelete.node(depth - 1).type.name === 'doc') {
                const listStart = $beforeDelete.start(depth);
                const listEnd = listStart + nodeAtDepth.nodeSize;
                
                // Verify the boundaries match
                if (listStart !== draggedFrom || listEnd !== draggedTo) {
                  console.warn("⚠️ List boundaries don't match, adjusting:", {
                    originalFrom: draggedFrom,
                    originalTo: draggedTo,
                    verifiedFrom: listStart,
                    verifiedTo: listEnd,
                    nodeSize: nodeAtDepth.nodeSize
                  });
                  draggedFrom = listStart;
                  draggedTo = listEnd;
                  draggedBlockNode = nodeAtDepth;
                }
                
                foundListContainer = true;
                console.log("🟢 Verified list container to delete:", {
                  type: nodeAtDepth.type.name,
                  from: draggedFrom,
                  to: draggedTo,
                  nodeSize: nodeAtDepth.nodeSize,
                  depth
                });
                break;
              }
            }
          }
          
          if (!foundListContainer) {
            console.error("❌ Could not find list container at delete position!", {
              expected: draggedBlockNode.type.name,
              from: draggedFrom,
              to: draggedTo,
              depth: $beforeDelete.depth
            });
            if (currentDraggedNode) {
              currentDraggedNode.style.opacity = "1";
            }
            return;
          }
        }
        
        // For lists, do a final verification: ensure we're deleting the exact list container from doc.children
        // This ensures the original position is completely "unmarked" as a list
        if (draggedBlockNode.type.name === 'orderedList' || draggedBlockNode.type.name === 'bulletList') {
          // Find the exact list container in doc.children one more time to ensure we have correct boundaries
          let currentPos = 1;
          let foundExactList = false;
          for (let i = 0; i < state.doc.childCount; i++) {
            const child = state.doc.child(i);
            const childStart = currentPos;
            const childEnd = childStart + child.nodeSize;
            
            if ((child.type.name === 'orderedList' || child.type.name === 'bulletList') && 
                childStart === draggedFrom) {
              // Use the exact boundaries from doc.children
              draggedFrom = childStart;
              draggedTo = childEnd;
              draggedBlockNode = child;
              foundExactList = true;
              console.log("🟢 Final verification - using exact list boundaries from doc.children:", {
                index: i,
                from: draggedFrom,
                to: draggedTo,
                nodeSize: child.nodeSize,
                type: child.type.name
              });
              break;
            }
            currentPos = childEnd;
          }
          
          if (!foundExactList) {
            console.warn("⚠️ Could not find exact list match at draggedFrom, trying fallback search");
            // Fallback: search all lists to find one that matches by checking if draggedFrom is within its range
            currentPos = 1;
            for (let i = 0; i < state.doc.childCount; i++) {
              const child = state.doc.child(i);
              const childStart = currentPos;
              const childEnd = childStart + child.nodeSize;
              
              if ((child.type.name === 'orderedList' || child.type.name === 'bulletList') && 
                  draggedFrom >= childStart && draggedFrom < childEnd) {
                draggedFrom = childStart;
                draggedTo = childEnd;
                draggedBlockNode = child;
                console.log("🟢 Fallback - found list by position range:", {
                  index: i,
                  from: draggedFrom,
                  to: draggedTo,
                  nodeSize: child.nodeSize,
                  type: child.type.name
                });
                break;
              }
              currentPos = childEnd;
            }
          }
        }
        
        // Final safety check: ensure we have valid boundaries before deletion
        if (!draggedBlockNode || draggedFrom >= draggedTo || draggedFrom < 0) {
          console.error("❌ Invalid deletion boundaries:", { 
            hasNode: !!draggedBlockNode,
            from: draggedFrom, 
            to: draggedTo,
            nodeType: draggedBlockNode?.type.name
          });
          if (currentDraggedNode) {
            currentDraggedNode.style.opacity = "1";
          }
          return;
        }
        
        // Delete the dragged node - this completely removes/unmarks it from the original position
        // For lists, we need to ensure we're deleting the complete node structure
        const tr = state.tr;
        
        // Verify the node at the deletion position matches what we expect
        const nodeBeforeDelete = state.doc.nodeAt(draggedFrom);
        if (nodeBeforeDelete && 
            (draggedBlockNode.type.name === 'orderedList' || draggedBlockNode.type.name === 'bulletList') &&
            nodeBeforeDelete.type.name !== 'orderedList' && nodeBeforeDelete.type.name !== 'bulletList') {
          // The node at the position doesn't match - we need to find the list container properly
          console.warn("⚠️ Node at deletion position doesn't match, finding list container...");
          const $delPos = state.doc.resolve(draggedFrom);
          for (let depth = $delPos.depth; depth >= 0; depth--) {
            const nodeAtDepth = $delPos.node(depth);
            if ((nodeAtDepth.type.name === 'orderedList' || nodeAtDepth.type.name === 'bulletList') &&
                depth > 0 && $delPos.node(depth - 1).type.name === 'doc') {
              draggedFrom = $delPos.start(depth);
              draggedTo = draggedFrom + nodeAtDepth.nodeSize;
              draggedBlockNode = nodeAtDepth;
              console.log("🟢 Corrected list boundaries:", {
                from: draggedFrom,
                to: draggedTo,
                nodeSize: nodeAtDepth.nodeSize
              });
              break;
            }
          }
        }
        
        // Perform the deletion
        tr.delete(draggedFrom, draggedTo);
        console.log("🟢 Deleted list container (unmarked original position):", { 
          from: draggedFrom, 
          to: draggedTo, 
          nodeType: draggedBlockNode.type.name, 
          nodeSize: draggedBlockNode.nodeSize 
        });
        
        // After deletion, verify that no list structures remain at or near the original position
        // This is critical to ensure the position is completely "unmarked"
        const docAfterDelete = tr.doc;
        const checkPosition = Math.min(draggedFrom, docAfterDelete.content.size - 1);
        
        if (checkPosition >= 0 && checkPosition < docAfterDelete.content.size) {
          try {
            const $checkPos = docAfterDelete.resolve(checkPosition);
            
            // Check if there are any list structures remaining as direct children of doc
            // near the deletion point
            let currentPos = 1;
            for (let i = 0; i < docAfterDelete.childCount; i++) {
              const child = docAfterDelete.child(i);
              const childStart = currentPos;
              const childEnd = childStart + child.nodeSize;
              
              // Check if there's a list container at or very close to the original position
              if ((child.type.name === 'orderedList' || child.type.name === 'bulletList') &&
                  Math.abs(childStart - draggedFrom) < 10) { // Within 10 positions
                console.warn("⚠️ Found list structure remaining after deletion! Cleaning up...", {
                  index: i,
                  type: child.type.name,
                  from: childStart,
                  to: childEnd,
                  originalFrom: draggedFrom
                });
                
                // Delete any remaining list structure
                tr.delete(childStart, childEnd);
                console.log("🟢 Cleaned up remaining list structure:", {
                  from: childStart,
                  to: childEnd,
                  type: child.type.name
                });
                break;
              }
              currentPos = childEnd;
            }
          } catch (e) {
            console.warn("⚠️ Error checking for remaining list structures:", e);
          }
        }
        
        // Validate the adjusted position is within bounds
        const docSizeAfterDeletion = tr.doc.content.size;
        if (adjustedDropPos < 0) {
          console.warn("⚠️ Adjusted drop position is negative, setting to 0:", adjustedDropPos);
          adjustedDropPos = 0;
        }
        if (adjustedDropPos > docSizeAfterDeletion) {
          console.warn("⚠️ Adjusted drop position exceeds doc size, adjusting to end:", { adjustedDropPos, docSizeAfterDeletion });
          adjustedDropPos = docSizeAfterDeletion;
        }
        
        // Resolve the drop position in the new document
        const $newDrop = tr.doc.resolve(adjustedDropPos);
        console.log("🟢 Re-resolved drop position after deletion:", { 
          pos: adjustedDropPos, 
          depth: $newDrop.depth,
          nodeType: $newDrop.node($newDrop.depth).type.name
        });
        
        // Find the block node at the drop position (direct child of doc)
        let validInsertPos = 0;
        let foundDropBlock = false;
        
        // Walk up from the drop position to find the top-level block (direct child of doc)
        for (let depth = $newDrop.depth; depth >= 0; depth--) {
          const nodeAtDepth = $newDrop.node(depth);
          
          // Check if this is a block-level node that's a direct child of doc
          if (depth > 0 && nodeAtDepth.isBlock) {
            const parent = $newDrop.node(depth - 1);
            if (parent && parent.type.name === 'doc') {
              // Found a block that's a direct child of doc
              const blockStart = $newDrop.start(depth);
              const blockEnd = blockStart + nodeAtDepth.nodeSize;
              
              if (shouldInsertBefore) {
                validInsertPos = blockStart;
              } else {
                validInsertPos = blockEnd;
              }
              foundDropBlock = true;
              console.log("🟢 Found drop block after deletion:", {
                depth,
                blockType: nodeAtDepth.type.name,
                blockStart,
                blockEnd,
                validInsertPos,
                shouldInsertBefore
              });
              break;
            }
          }
          
          // If we've reached doc level, check its children
          if (nodeAtDepth.type.name === 'doc') {
            // Get the block index at depth 0 (direct child of doc)
            // We need to find which block contains our position
            const docNode = nodeAtDepth;
            
            // Find the block that contains adjustedDropPos
            let blockIndex = -1;
            let currentPos = 0;
            
            for (let i = 0; i < docNode.childCount; i++) {
              const child = docNode.child(i);
              const childStart = currentPos;
              const childEnd = currentPos + child.nodeSize;
              
              if (adjustedDropPos >= childStart && adjustedDropPos < childEnd) {
                blockIndex = i;
                const blockStart = childStart;
                const blockEnd = childEnd;
                
                if (shouldInsertBefore) {
                  validInsertPos = blockStart;
                } else {
                  validInsertPos = blockEnd;
                }
                foundDropBlock = true;
                console.log("🟢 Found drop block after deletion (by iteration):", {
                  blockIndex: i,
                  blockType: child.type.name,
                  blockStart,
                  blockEnd,
                  validInsertPos,
                  shouldInsertBefore,
                  adjustedDropPos
                });
                break;
              }
              
              currentPos = childEnd;
            }
            
            // If still not found, use boundary
            if (!foundDropBlock) {
              validInsertPos = shouldInsertBefore ? 0 : tr.doc.content.size;
              console.log("🟢 No block found, using doc boundary:", { validInsertPos, shouldInsertBefore, adjustedDropPos });
            }
            break;
          }
        }
        
        // Ensure position is within valid bounds (reuse docSizeAfterDeletion from above)
        if (validInsertPos < 0) {
          console.warn("⚠️ Insert position is negative, setting to 0:", validInsertPos);
          validInsertPos = 0;
        }
        if (validInsertPos > docSizeAfterDeletion) {
          console.warn("⚠️ Insert position exceeds doc size, adjusting to end:", { validInsertPos, docSizeAfterDeletion });
          validInsertPos = docSizeAfterDeletion;
        }
        
        // Verify the position is valid for insertion
        const $insertPos = tr.doc.resolve(validInsertPos);
        console.log("🟢 Final insert position:", { 
          validInsertPos,
          docSize: docSizeAfterDeletion,
          shouldInsertBefore,
          depth: $insertPos.depth,
          parentType: $insertPos.parent.type.name
        });
        
        // Insert at the validated position
        tr.insert(validInsertPos, nodeToInsert);
        console.log("🟢 Inserting node at:", validInsertPos, "nodeType:", nodeToInsert.type.name);
        
        // Apply transaction
        editor.view.dispatch(tr);
        console.log("✅ Transaction dispatched successfully!");
        
        // After dispatching, check the DOM for any remaining empty list elements at the original position
        // This ensures the position is completely "unmarked" visually
        setTimeout(() => {
          try {
            const editorElement = editor.view.dom;
            const allLists = editorElement.querySelectorAll('ul, ol');
            
            allLists.forEach((list) => {
              const listElement = list as HTMLElement;
              // Check if the list is empty or only contains empty list items
              const listItems = listElement.querySelectorAll('li');
              let isEmpty = true;
              
              for (let i = 0; i < listItems.length; i++) {
                const li = listItems[i];
                const textContent = li.textContent?.trim() || '';
                // Check if list item has any meaningful content (text or other elements)
                if (textContent.length > 0 || li.querySelector('p, h1, h2, h3, h4, h5, h6, img, table')) {
                  isEmpty = false;
                  break;
                }
              }
              
              // If list is empty and matches the dragged node, remove it
              if (isEmpty && currentDraggedNode && listElement === currentDraggedNode) {
                console.log("🟢 Removing empty list element from DOM:", listElement);
                listElement.remove();
              }
            });
          } catch (e) {
            console.warn("⚠️ Error cleaning up DOM elements:", e);
          }
        }, 0);
      } catch (error) {
        console.error("❌ Error in transaction:", error);
        if (currentDraggedNode) {
          currentDraggedNode.style.opacity = "1";
        }
        return;
      }

      if (currentDraggedNode) {
        currentDraggedNode.style.opacity = "1";
      }
      
      draggedNode = null;
      draggedNodePos = null;
      setDraggedNodePos(null);
    };

    const handleDragEnd = () => {
      editorElement
        .querySelectorAll(".drag-drop-indicator")
        .forEach((el) => el.remove());

      if (hoveredNode) {
        hoveredNode.style.opacity = "1";
        hoveredNode.style.cursor = "";
      }
      
      draggedNode = null;
      draggedNodePos = null;
      setDraggedNodePos(null);
    };

    editorElement.addEventListener("mousemove", handleMouseMove);
    editorElement.addEventListener("mouseleave", handleMouseLeave);
    editorElement.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    editorElement.addEventListener("dragstart", handleDragStart);
    editorElement.addEventListener("dragover", handleDragOver);
    editorElement.addEventListener("dragleave", handleDragLeave);
    editorElement.addEventListener("drop", handleDrop);
    editorElement.addEventListener("dragend", handleDragEnd);

    return () => {
      editorElement.removeEventListener("mousemove", handleMouseMove);
      editorElement.removeEventListener("mouseleave", handleMouseLeave);
      editorElement.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      editorElement.removeEventListener("dragstart", handleDragStart);
      editorElement.removeEventListener("dragover", handleDragOver);
      editorElement.removeEventListener("dragleave", handleDragLeave);
      editorElement.removeEventListener("drop", handleDrop);
      editorElement.removeEventListener("dragend", handleDragEnd);
    };
  }, [editor, hoveredNode, draggedNodePos]);

  if (!visible || !editor) return null;

  return (
    <div
      ref={dragHandleRef}
      className="drag-handle absolute z-50 flex items-center justify-center w-8 h-8 cursor-grab active:cursor-grabbing group"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      draggable={true}
      onMouseEnter={() => {
        if (hoveredNode) {
          setVisible(true);
        }
      }}
      onMouseLeave={(e) => {
        // Don't hide immediately - give time to move between handle and text
        const relatedTarget = e.relatedTarget;
        // Check if relatedTarget is a valid Node before calling contains()
        const isValidNode = relatedTarget && relatedTarget instanceof Node;
        if (!isValidNode || (hoveredNode && !hoveredNode.contains(relatedTarget as Node) && !(relatedTarget as HTMLElement)?.closest(".drag-handle"))) {
          setTimeout(() => {
            // Check if we're still not over the handle or block
            const currentTarget = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
            if (!currentTarget?.closest(".drag-handle") && hoveredNode && !hoveredNode.contains(currentTarget)) {
              setVisible(false);
            }
          }, 300);
        }
      }}
    >
      <div className="flex flex-col gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-gray-400 group-hover:text-gray-600"
        >
          <circle cx="2.5" cy="2.5" r="1.5" fill="currentColor" />
          <circle cx="7" cy="2.5" r="1.5" fill="currentColor" />
          <circle cx="11.5" cy="2.5" r="1.5" fill="currentColor" />
          <circle cx="2.5" cy="7" r="1.5" fill="currentColor" />
          <circle cx="7" cy="7" r="1.5" fill="currentColor" />
          <circle cx="11.5" cy="7" r="1.5" fill="currentColor" />
          <circle cx="2.5" cy="11.5" r="1.5" fill="currentColor" />
          <circle cx="7" cy="11.5" r="1.5" fill="currentColor" />
          <circle cx="11.5" cy="11.5" r="1.5" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

