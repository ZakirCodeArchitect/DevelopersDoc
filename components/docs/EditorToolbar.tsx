"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useState, useRef } from "react";

export function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [, forceUpdate] = useState({});
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Force re-render when editor selection changes
  useEffect(() => {
    if (!editor) return;

    const updateHandler = () => {
      forceUpdate({});
    };

    editor.on('selectionUpdate', updateHandler);
    editor.on('transaction', updateHandler);

    return () => {
      editor.off('selectionUpdate', updateHandler);
      editor.off('transaction', updateHandler);
    };
  }, [editor]);

  if (!editor) return null;

  const iconBtn = (active = false, additionalClasses = "") =>
    `px-2.5 py-2 rounded-md hover:bg-gray-100 transition-colors ${
      active ? "bg-gray-200" : "bg-transparent"
    } ${additionalClasses}`;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert("File size should not exceed 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    };
    reader.readAsDataURL(file);
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || "");
    setShowLinkInput(true);
  };

  const applyLink = () => {
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const setHighlightColor = (color: string) => {
    if (color === 'none') {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color }).run();
    }
    setShowHighlightMenu(false);
  };

  // Get current heading level for display
  const getCurrentHeading = () => {
    if (editor.isActive("heading", { level: 1 })) return "H";
    if (editor.isActive("heading", { level: 2 })) return "H";
    if (editor.isActive("heading", { level: 3 })) return "H";
    if (editor.isActive("heading", { level: 4 })) return "H";
    return "H";
  };

  return (
    <div className="sticky top-0 z-10 bg-white border border-gray-200 rounded-lg shadow-sm w-full">
      <div className="flex items-center gap-1 p-3 flex-wrap relative w-full">
        {/* Undo/Redo */}
        <button
          type="button"
          className={iconBtn(false, "text-gray-500")}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          type="button"
          className={iconBtn(false, "text-gray-500")}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-200 mx-2"></div>

        {/* Heading Dropdown */}
        <div className="relative">
          <button
            type="button"
            className={iconBtn(editor.isActive("heading"), "text-gray-700 font-semibold flex items-center gap-1 px-2")}
            onClick={() => setShowHeadingMenu(!showHeadingMenu)}
            title="Heading"
          >
            {getCurrentHeading()}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showHeadingMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowHeadingMenu(false)}></div>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[140px]">
                {[1, 2, 3, 4].map((level) => (
                  <button
                    key={level}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: level as any }).run();
                      setShowHeadingMenu(false);
                    }}
                  >
                    <span className="text-gray-400">H{level}</span> Heading {level}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* List Dropdown */}
        <div className="relative">
          <button
            type="button"
            className={iconBtn(editor.isActive("bulletList") || editor.isActive("orderedList") || editor.isActive("taskList"), "text-gray-600 flex items-center gap-1 px-1")}
            onClick={() => setShowListMenu(!showListMenu)}
            title="Lists"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showListMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowListMenu(false)}></div>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-3"
                  onClick={() => {
                    editor.chain().focus().toggleBulletList().run();
                    setShowListMenu(false);
                  }}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Bullet List
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-3"
                  onClick={() => {
                    editor.chain().focus().toggleOrderedList().run();
                    setShowListMenu(false);
                  }}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-10 4h10" />
                  </svg>
                  Ordered List
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-3"
                  onClick={() => {
                    editor.chain().focus().toggleTaskList().run();
                    setShowListMenu(false);
                  }}
                >
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Task List
                </button>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className={iconBtn(editor.isActive("orderedList"), "text-gray-600")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-10 4h10" />
          </svg>
        </button>

        <button
          type="button"
          className={iconBtn(editor.isActive("codeBlock"), "text-gray-600")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-200 mx-2"></div>

        {/* Text Formatting */}
      <button
        type="button"
          className={iconBtn(editor.isActive("bold"), "text-gray-700 font-bold text-base min-w-[36px]")}
        onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
      >
        B
      </button>
      <button
        type="button"
          className={iconBtn(editor.isActive("italic"), "text-gray-700 italic font-serif text-base min-w-[36px]")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
      >
        I
      </button>
      <button
        type="button"
          className={iconBtn(editor.isActive("strike"), "text-gray-700 text-base min-w-[36px]")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <span className="line-through">S</span>
        </button>
        <button
          type="button"
          className={iconBtn(editor.isActive("code"), "text-gray-700 font-mono text-sm min-w-[40px]")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline Code"
        >
          &lt;/&gt;
        </button>
        <button
          type="button"
          className={iconBtn(editor.isActive("underline"), "text-gray-700 underline text-base min-w-[36px]")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
      >
        U
      </button>

        {/* Highlight with color picker */}
        <div className="relative">
      <button
        type="button"
            className={iconBtn(editor.isActive("highlight"), "text-gray-600")}
            onClick={() => setShowHighlightMenu(!showHighlightMenu)}
            title="Highlight"
      >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
      </button>
          {showHighlightMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowHighlightMenu(false)}></div>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-green-200 hover:ring-2 ring-gray-400"
                  onClick={() => setHighlightColor('#bbf7d0')}
                  title="Green"
                />
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-blue-200 hover:ring-2 ring-gray-400"
                  onClick={() => setHighlightColor('#bfdbfe')}
                  title="Blue"
                />
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-red-200 hover:ring-2 ring-gray-400"
                  onClick={() => setHighlightColor('#fecaca')}
                  title="Red"
                />
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-purple-200 hover:ring-2 ring-gray-400"
                  onClick={() => setHighlightColor('#e9d5ff')}
                  title="Purple"
                />
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-yellow-200 hover:ring-2 ring-gray-400"
                  onClick={() => setHighlightColor('#fef08a')}
                  title="Yellow"
                />
                <div className="w-px h-6 bg-gray-200 mx-2"></div>
      <button
        type="button"
                  className="w-8 h-8 rounded-full border-2 border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                  onClick={() => setHighlightColor('none')}
                  title="Remove highlight"
      >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
      </button>
              </div>
            </>
          )}
        </div>

        {/* Link with inline editor */}
        <div className="relative">
      <button
        type="button"
            className={iconBtn(editor.isActive("link") || showLinkInput, "text-purple-600")}
            onClick={setLink}
            title="Link"
      >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
      </button>
          {showLinkInput && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowLinkInput(false)}></div>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 min-w-[300px]">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://tiptap.dev/docs/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  autoFocus
                />
                <div className="flex items-center gap-2 mt-2">
      <button
        type="button"
                    onClick={applyLink}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Apply"
      >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
      </button>
      <button
        type="button"
                    onClick={() => window.open(linkUrl, '_blank')}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Open in new tab"
      >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
      </button>
      <button
        type="button"
                    onClick={removeLink}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Remove link"
      >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
      </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 mx-2"></div>

        {/* Superscript/Subscript */}
        <button
          type="button"
          className={iconBtn(editor.isActive("superscript"), "text-gray-700 min-w-[40px]")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          title="Superscript"
        >
          <span className="text-base">x<sup className="text-xs">2</sup></span>
        </button>
        <button
          type="button"
          className={iconBtn(editor.isActive("subscript"), "text-gray-700 min-w-[40px]")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          title="Subscript"
        >
          <span className="text-base">x<sub className="text-xs">2</sub></span>
        </button>

        <div className="w-px h-6 bg-gray-200 mx-2"></div>

        {/* Alignment */}
      <button
        type="button"
          className={iconBtn(editor.isActive({ textAlign: "left" }), "text-gray-600")}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Align Left"
      >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
          </svg>
      </button>
      <button
        type="button"
          className={iconBtn(editor.isActive({ textAlign: "center" }), "text-gray-600")}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Align Center"
      >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
          </svg>
      </button>
      <button
        type="button"
          className={iconBtn(editor.isActive({ textAlign: "right" }), "text-gray-600")}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Align Right"
      >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
          </svg>
      </button>
      <button
        type="button"
          className={iconBtn(editor.isActive({ textAlign: "justify" }), "text-gray-600")}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          title="Justify"
      >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
      </button>

        <div className="w-px h-6 bg-gray-200 mx-2"></div>

        {/* Add Menu with Image Upload */}
        <div className="relative">
      <button
        type="button"
            className={iconBtn(false, "text-gray-700 font-medium flex items-center gap-1 px-2")}
            onClick={() => setShowAddMenu(!showAddMenu)}
            title="Add"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Add
      </button>
          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)}></div>
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[400px] p-4">
                <div className="space-y-3">
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-700 font-medium underline">Click to upload</span>
                        <span className="text-gray-600"> or drag and drop</span>
                      </div>
                      <p className="text-sm text-gray-400">Maximum 3 files, 5MB each.</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    multiple={false}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

