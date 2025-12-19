import React from 'react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  filename?: string;
  language?: string;
  code: string;
  highlightedLines?: number[];
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  filename,
  language,
  code,
  highlightedLines = [],
  className,
}) => {
  const lines = code.split('\n');

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 overflow-hidden',
        'bg-blue-50',
        className
      )}
    >
      {filename && (
        <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
          <span className="text-sm font-mono text-gray-600">
            {filename}
          </span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto bg-blue-50">
        <code className={cn('font-mono text-sm text-gray-800', language && `language-${language}`)}>
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const isHighlighted = highlightedLines.includes(lineNumber);
            return (
              <div
                key={index}
                className={cn(
                  isHighlighted && 'bg-blue-200 -mx-4 px-4 py-0.5 block'
                )}
              >
                {line || '\u00A0'}
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
};

