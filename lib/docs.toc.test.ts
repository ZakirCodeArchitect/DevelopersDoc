import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateTocFromSections } from './docs';

describe('generateTocFromSections', () => {
  it('keeps TOC ids unique when headings repeat', () => {
    const toc = generateTocFromSections([
      { id: 'sec-1', title: 'CLI scan', type: 'html', content: ['<p>a</p>'] },
      { id: 'sec-2', title: 'CLI scan', type: 'html', content: ['<h3>Request</h3><h3>Request</h3>'] },
      { id: 'sec-3', title: 'Publish', type: 'html', content: ['<h4 id="result">Result</h4><h4 id="result">Result</h4>'] },
    ]);

    const ids = toc.map((t) => t.id);
    assert.equal(ids.length, new Set(ids).size);
  });
});
