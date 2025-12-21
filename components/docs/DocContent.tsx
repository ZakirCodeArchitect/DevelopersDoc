import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';
import { DocNavigation } from './DocNavigation';
import type { NavLink } from './DocNavigation';

interface DocContentProps {
  title: string;
  children: React.ReactNode;
  lastUpdated?: string;
  previous?: NavLink;
  next?: NavLink;
  className?: string;
}

export const DocContent: React.FC<DocContentProps> = memo(({
  title,
  children,
  lastUpdated,
  previous,
  next,
  className,
}) => {
  return (
    <main
      className={cn(
        'flex-1 w-full',
        'px-8 py-8',
        className
      )}
    >
      <article className="max-w-3xl w-full">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          {title}
        </h1>
        <div className="prose prose-gray max-w-none space-y-6">
          {children}
        </div>
        {lastUpdated && (
          <p className="text-sm text-gray-500 mt-8">
            Last updated on {lastUpdated}
          </p>
        )}
        <DocNavigation previous={previous} next={next} />
      </article>
    </main>
  );
});

DocContent.displayName = 'DocContent';

// Export CodeBlock for convenience
export { CodeBlock };

