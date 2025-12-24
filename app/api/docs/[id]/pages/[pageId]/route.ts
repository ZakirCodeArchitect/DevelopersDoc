import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import docsData from '@/data/docs.json';

// Helper to render a Tiptap node to HTML
function renderNodeToHTML(node: any): string {
  if (!node) return '';

  const escapeHTML = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const renderMarks = (text: string, marks: any[] = []) => {
    // First escape the text
    let result = escapeHTML(text);
    marks.forEach((mark) => {
      switch (mark.type) {
        case 'bold':
          result = `<strong>${result}</strong>`;
          break;
        case 'italic':
          result = `<em>${result}</em>`;
          break;
        case 'underline':
          result = `<u>${result}</u>`;
          break;
        case 'strike':
          result = `<s>${result}</s>`;
          break;
        case 'code':
          result = `<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">${result}</code>`;
          break;
        case 'link':
          result = `<a href="${escapeHTML(mark.attrs?.href || '#')}" class="text-blue-600 underline hover:text-blue-800">${result}</a>`;
          break;
        case 'highlight':
          const color = mark.attrs?.color || '#fef08a';
          result = `<mark data-color="${color}" style="background-color: ${color}">${result}</mark>`;
          break;
        case 'subscript':
          result = `<sub>${result}</sub>`;
          break;
        case 'superscript':
          result = `<sup>${result}</sup>`;
          break;
      }
    });
    return result;
  };

  const renderContent = (content: any[] = []): string => {
    return content.map((child) => renderNodeToHTML(child)).join('');
  };

  switch (node.type) {
    case 'text':
      return renderMarks(node.text || '', node.marks);
    
    case 'paragraph':
      const pAlign = node.attrs?.textAlign;
      const pStyle = pAlign && pAlign !== 'left' ? ` style="text-align: ${pAlign}"` : '';
      return `<p${pStyle}>${renderContent(node.content)}</p>`;
    
    case 'heading':
      const level = node.attrs?.level || 1;
      const hAlign = node.attrs?.textAlign;
      const hStyle = hAlign && hAlign !== 'left' ? ` style="text-align: ${hAlign}"` : '';
      return `<h${level}${hStyle}>${renderContent(node.content)}</h${level}>`;
    
    case 'bulletList':
      return `<ul>${renderContent(node.content)}</ul>`;
    
    case 'orderedList':
      return `<ol>${renderContent(node.content)}</ol>`;
    
    case 'listItem':
      return `<li>${renderContent(node.content)}</li>`;
    
    case 'taskList':
      return `<ul data-type="taskList">${renderContent(node.content)}</ul>`;
    
    case 'taskItem':
      const checked = node.attrs?.checked ? 'checked' : '';
      return `<li data-type="taskItem" data-checked="${node.attrs?.checked || false}"><label><input type="checkbox" ${checked}><span>${renderContent(node.content)}</span></label></li>`;
    
    case 'blockquote':
      return `<blockquote>${renderContent(node.content)}</blockquote>`;
    
    case 'codeBlock':
      const code = node.content?.map((n: any) => n.text || '').join('') || '';
      // Escape HTML entities in code
      const escapedCode = escapeHTML(code);
      return `<pre class="bg-gray-100 rounded-md p-4 my-4"><code class="block">${escapedCode}</code></pre>`;
    
    case 'hardBreak':
      return '<br />';
    
    case 'horizontalRule':
      return '<hr />';
    
    default:
      return renderContent(node.content);
  }
}

// Helper to convert Tiptap JSON to page sections with HTML content
function convertTiptapJSONToSections(tiptapJSON: any, pageId: string) {
  const sections: any[] = [];
  let currentSection: any = null;
  let contentBeforeFirstHeading: string[] = [];
  let pageTitle: string = 'Untitled';
  let foundH1 = false;

  tiptapJSON.content?.forEach((node: any) => {
    // Extract H1 as page title (only the first one)
    if (node.type === 'heading' && node.attrs?.level === 1 && !foundH1) {
      pageTitle = node.content?.map((n: any) => n.text || '').join('').trim() || 'Untitled';
      foundH1 = true;
      return; // Skip adding H1 to content
    }
    
    if (node.type === 'heading' && node.attrs?.level === 2) {
      // If we have content before first heading, create a section without a title
      if (sections.length === 0 && contentBeforeFirstHeading.length > 0) {
        sections.push({
          id: `${pageId}-intro`,
          title: '', // Empty title - content before first H2
          type: 'html',
          content: contentBeforeFirstHeading,
        });
        contentBeforeFirstHeading = [];
      }
      
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Start new section
      const titleText = node.content?.map((n: any) => n.text || '').join('').trim() || '';
      const sectionId = titleText
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `section-${sections.length}`;
      
      currentSection = {
        id: `${pageId}-${sectionId}`,
        title: titleText, // Can be empty string
        type: 'html',
        content: [],
      };
    } else {
      // Add any content (paragraphs, lists, code blocks, etc.) as HTML
      const html = renderNodeToHTML(node);
      if (html.trim()) {
        if (currentSection) {
          // Add to current section
          currentSection.content.push(html);
        } else {
          // Add to content before first heading
          contentBeforeFirstHeading.push(html);
        }
      }
    }
  });

  // Save last section
  if (currentSection) {
    sections.push(currentSection);
  }

  // If we still have content before first heading and no sections, create a section without a title
  if (sections.length === 0 && contentBeforeFirstHeading.length > 0) {
    sections.push({
      id: `${pageId}-content`,
      title: '', // Empty title - content exists but no heading
      type: 'html',
      content: contentBeforeFirstHeading,
    });
  }

  // If no sections were created at all, create an empty default one
  if (sections.length === 0) {
    sections.push({
      id: `${pageId}-section`,
      title: '',
      type: 'html',
      content: ['<p></p>'],
    });
  }

  return { title: pageTitle, sections };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const resolvedParams = await params;
    const docId = resolvedParams.id;
    const pageId = resolvedParams.pageId;
    const body = await request.json();
    const { content, projectId } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Convert Tiptap JSON to sections and extract title
    const { title, sections } = convertTiptapJSONToSections(content, pageId);

    // If projectId is provided, update page in project document
    if (projectId) {
      const project = docsData.projects.find((p) => p.id === projectId);
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const doc = project.documents?.find((d) => d.id === docId);
      if (!doc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      const docContent = doc.content as any;
      if (!docContent.pages) {
        return NextResponse.json(
          { error: 'Document has no pages' },
          { status: 404 }
        );
      }

      const page = docContent.pages.find((p: any) => p.id === pageId);
      if (!page) {
        return NextResponse.json(
          { error: 'Page not found' },
          { status: 404 }
        );
      }

      // Update page title and sections
      page.title = title;
      page.sections = sections;

      // Update lastUpdated date
      doc.lastUpdated = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Write to file
      const filePath = path.join(process.cwd(), 'data', 'docs.json');
      await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

      return NextResponse.json({
        success: true,
        page,
      });
    } else {
      // Update page in "Your Docs" document
      const doc = docsData.yourDocs.find((d) => d.id === docId);
      if (!doc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      const docContent = doc.content as any;
      if (!docContent.pages) {
        return NextResponse.json(
          { error: 'Document has no pages' },
          { status: 404 }
        );
      }

      const page = docContent.pages.find((p: any) => p.id === pageId);
      if (!page) {
        return NextResponse.json(
          { error: 'Page not found' },
          { status: 404 }
        );
      }

      // Update page title and sections
      page.title = title;
      page.sections = sections;

      // Update lastUpdated date
      doc.lastUpdated = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Write to file
      const filePath = path.join(process.cwd(), 'data', 'docs.json');
      await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

      return NextResponse.json({
        success: true,
        page,
      });
    }
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

