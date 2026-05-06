/**
 * Sanitize HTML for doc viewer (generated + editor-exported content).
 * - Decodes common double-escaped generator tags so <strong> renders as HTML.
 * - Strips script tags and inline event handlers; does not claim full XSS parity.
 */

const DOUBLE_ESCAPED_SAFE_TAG =
  /&lt;(\/?)(strong|em|code|pre|table|thead|tbody|tr|th|td|ul|ol|li|p|div|span|h[1-6]|a|br)(\s[^&]*?)?&gt;/gi;

export function sanitizeDocHtmlForViewer(html: string): string {
  if (!html) return '';
  let out = html.replace(DOUBLE_ESCAPED_SAFE_TAG, '<$1$2$3>');
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  return out;
}
