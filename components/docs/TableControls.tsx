"use client";

import { Editor } from "@tiptap/react";
import { useEffect, useState, useRef } from "react";

interface TableControlsProps {
  editor: Editor;
}

export function TableControls({ editor }: TableControlsProps) {
  const [tableElement, setTableElement] = useState<HTMLTableElement | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [rowPositions, setRowPositions] = useState<number[]>([]);
  const [colPositions, setColPositions] = useState<number[]>([]);
  const [rowHeights, setRowHeights] = useState<number[]>([]);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [tableHeight, setTableHeight] = useState<number>(0);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updateTable = () => {
      if (editor.isActive('table')) {
        const { selection } = editor.state;
        const { $from } = selection;
        
        // Find the table element
        let depth = $from.depth;
        while (depth > 0) {
          const node = $from.node(depth);
          if (node.type.name === 'table') {
            const pos = $from.before(depth);
            const domAtPos = editor.view.domAtPos(pos + 1);
            let element = domAtPos.node as HTMLElement;
            
            while (element && element.tagName !== 'TABLE') {
              if (element.parentElement) {
                element = element.parentElement;
              } else {
                break;
              }
            }
            
            if (element && element.tagName === 'TABLE') {
              const table = element as HTMLTableElement;
              setTableElement(table);
              
              // Calculate row and column positions
              const rows = table.querySelectorAll('tr');
              const firstRow = rows[0];
              const cols = firstRow?.children.length || 0;
              
              // Get table position relative to editor
              const tableRect = table.getBoundingClientRect();
              const editorRect = editor.view.dom.getBoundingClientRect();
              
              // Calculate row positions and heights relative to table
              const rowPos: number[] = [];
              const rowHeights: number[] = [];
              const tableTop = table.getBoundingClientRect().top;
              
              rows.forEach((row) => {
                const rowRect = row.getBoundingClientRect();
                rowPos.push(rowRect.top - tableTop);
                rowHeights.push(rowRect.height);
              });
              
              setRowPositions(rowPos);
              setRowHeights(rowHeights);
              
              // Calculate column positions and widths relative to table
              const colPos: number[] = [];
              const colWidths: number[] = [];
              const tableLeft = table.getBoundingClientRect().left;
              
              if (firstRow) {
                Array.from(firstRow.children).forEach((cell) => {
                  const cellRect = (cell as HTMLElement).getBoundingClientRect();
                  colPos.push(cellRect.left - tableLeft);
                  colWidths.push(cellRect.width);
                });
              }
              
              setColPositions(colPos);
              setColWidths(colWidths);
              
              // Store table dimensions for 3-dots button positioning
              setTableHeight(tableRect.height);
              setTableWidth(tableRect.width);
              
              // Position the wrapper
              if (tableRef.current) {
                const scrollTop = editor.view.dom.scrollTop || 0;
                const scrollLeft = editor.view.dom.scrollLeft || 0;
                tableRef.current.style.top = `${tableRect.top - editorRect.top + scrollTop}px`;
                tableRef.current.style.left = `${tableRect.left - editorRect.left + scrollLeft}px`;
              }
            }
            break;
          }
          depth--;
        }
      } else {
        setTableElement(null);
      }
    };

    editor.on('selectionUpdate', updateTable);
    editor.on('update', updateTable);
    
    // Also update on scroll/resize
    const handleUpdate = () => {
      if (tableElement) {
        updateTable();
      }
    };
    
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    updateTable();

    return () => {
      editor.off('selectionUpdate', updateTable);
      editor.off('update', updateTable);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [editor, tableElement]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowTableMenu(false);
      }
    };

    if (showTableMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTableMenu]);



  if (!tableElement || !editor) return null;

  const rows = tableElement.querySelectorAll('tr');
  const firstRow = rows[0];
  const cols = firstRow?.children.length || 0;

  const addRowAfter = () => {
    editor.chain().focus().addRowAfter().run();
  };

  const addRowBefore = () => {
    editor.chain().focus().addRowBefore().run();
  };

  const deleteRow = () => {
    editor.chain().focus().deleteRow().run();
  };

  const addColumnAfter = () => {
    editor.chain().focus().addColumnAfter().run();
  };

  const addColumnBefore = () => {
    editor.chain().focus().addColumnBefore().run();
  };

  const deleteColumn = () => {
    editor.chain().focus().deleteColumn().run();
  };

  const toggleHeaderRow = () => {
    editor.chain().focus().toggleHeaderRow().run();
  };

  const toggleHeaderColumn = () => {
    editor.chain().focus().toggleHeaderColumn().run();
  };

  const mergeCells = () => {
    editor.chain().focus().mergeCells().run();
  };

  const splitCell = () => {
    editor.chain().focus().splitCell().run();
  };

  const deleteTable = () => {
    editor.chain().focus().deleteTable().run();
    setSelectedRow(null);
    setSelectedCol(null);
  };

  return (
    <div
      ref={tableRef}
      className="table-controls-wrapper"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* Column controls - above table, aligned with columns */}
      <div
        className="table-column-controls"
        style={{
          position: 'absolute',
          top: '-32px',
          left: '0px',
          display: 'flex',
          pointerEvents: 'auto',
        }}
      >
        {Array.from({ length: cols }).map((_, colIndex) => (
          <div
            key={colIndex}
            className="column-handle"
            style={{
              width: `${colWidths[colIndex] || 100}px`,
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: '4px',
              marginRight: colIndex < cols - 1 ? '1px' : '0',
              backgroundColor: hoveredCol === colIndex || selectedCol === colIndex 
                ? 'rgba(204, 86, 30, 0.15)' 
                : 'rgba(0, 0, 0, 0.02)',
              border: selectedCol === colIndex ? '1px solid #CC561E' : '1px solid transparent',
            }}
            onMouseEnter={() => setHoveredCol(colIndex)}
            onMouseLeave={() => setHoveredCol(null)}
            onClick={(e) => {
              e.stopPropagation();
              // Toggle selection - if already selected, deselect
              if (selectedCol === colIndex) {
                setSelectedCol(null);
              } else {
                setSelectedCol(colIndex);
                setSelectedRow(null);
              }
            }}
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="none" 
              className="text-gray-400"
              style={{ cursor: 'pointer', opacity: 0.6 }}
            >
              <circle cx="4" cy="8" r="1.5" fill="currentColor" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="12" cy="8" r="1.5" fill="currentColor" />
            </svg>
          </div>
        ))}
        {/* Add column button */}
        <button
          onClick={addColumnAfter}
          className="add-column-btn"
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            border: '1px dashed #CC561E',
            backgroundColor: 'white',
            cursor: 'pointer',
            color: '#CC561E',
            marginLeft: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FEF3E7';
            e.currentTarget.style.borderColor = '#CC561E';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#CC561E';
          }}
          title="Add column"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Row controls - left of table, aligned with rows */}
      <div
        className="table-row-controls"
        style={{
          position: 'absolute',
          left: '-40px',
          top: '0px',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
        }}
      >
        {Array.from(rows).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="row-handle"
            style={{
              width: '36px',
              height: `${rowHeights[rowIndex] || 40}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: '4px',
              marginBottom: rowIndex < rows.length - 1 ? '1px' : '0',
              backgroundColor: hoveredRow === rowIndex || selectedRow === rowIndex
                ? 'rgba(204, 86, 30, 0.15)'
                : 'rgba(0, 0, 0, 0.02)',
              border: selectedRow === rowIndex ? '1px solid #CC561E' : '1px solid transparent',
            }}
            onMouseEnter={() => setHoveredRow(rowIndex)}
            onMouseLeave={() => setHoveredRow(null)}
            onClick={(e) => {
              e.stopPropagation();
              // Toggle selection - if already selected, deselect
              if (selectedRow === rowIndex) {
                setSelectedRow(null);
              } else {
                setSelectedRow(rowIndex);
                setSelectedCol(null);
              }
            }}
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="none" 
              className="text-gray-400"
              style={{ cursor: 'pointer', opacity: 0.6 }}
            >
              <circle cx="8" cy="4" r="1.5" fill="currentColor" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="8" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
        ))}
        {/* Add row button */}
        <button
          onClick={addRowAfter}
          className="add-row-btn"
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            border: '1px dashed #CC561E',
            backgroundColor: 'white',
            cursor: 'pointer',
            color: '#CC561E',
            marginTop: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FEF3E7';
            e.currentTarget.style.borderColor = '#CC561E';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#CC561E';
          }}
          title="Add row"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Backdrop to close menu when clicking outside */}
      {(selectedRow !== null || selectedCol !== null) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            pointerEvents: 'auto',
          }}
          onClick={() => {
            setSelectedRow(null);
            setSelectedCol(null);
          }}
        />
      )}

      {/* Table context menu - appears when row/column is selected */}
      {(selectedRow !== null || selectedCol !== null) && (
        <div
          className="table-context-menu"
          style={{
            position: 'absolute',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '6px',
            minWidth: '200px',
            zIndex: 50,
            pointerEvents: 'auto',
            top: selectedRow !== null 
              ? `${rowPositions[selectedRow] + rowHeights[selectedRow] / 2 - 10}px`
              : '-40px',
            left: selectedCol !== null 
              ? `${colPositions[selectedCol] + colWidths[selectedCol] + 8}px`
              : '50px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedRow !== null && (
            <>
              <button
                onClick={() => {
                  addRowBefore();
                  setSelectedRow(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add row above
              </button>
              <button
                onClick={() => {
                  addRowAfter();
                  setSelectedRow(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add row below
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  deleteRow();
                  setSelectedRow(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 rounded-lg text-sm font-medium text-red-600 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete row
              </button>
            </>
          )}
          {selectedCol !== null && (
            <>
              <button
                onClick={() => {
                  addColumnBefore();
                  setSelectedCol(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add column left
              </button>
              <button
                onClick={() => {
                  addColumnAfter();
                  setSelectedCol(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add column right
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  deleteColumn();
                  setSelectedCol(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 rounded-lg text-sm font-medium text-red-600 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete column
              </button>
            </>
          )}
        </div>
      )}

      {/* 3-dots menu button at bottom right of table */}

      {/* 3-dots menu button at bottom right of table */}
      {tableElement && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            pointerEvents: 'auto',
            zIndex: 50,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTableMenu(!showTableMenu);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
            title="Table settings"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="text-gray-600"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showTableMenu && (
            <div
              className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  toggleHeaderRow();
                  setShowTableMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Toggle header row
              </button>
              <button
                onClick={() => {
                  toggleHeaderColumn();
                  setShowTableMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Toggle header column
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  setShowTableMenu(false);
                  deleteTable();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 rounded-lg text-sm font-medium text-red-600 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete table
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
