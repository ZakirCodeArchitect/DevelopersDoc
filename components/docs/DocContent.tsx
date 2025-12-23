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
  fullWidth?: boolean;
  hideTitle?: boolean;
}

export const DocContent: React.FC<DocContentProps> = memo(({
  title,
  children,
  lastUpdated,
  previous,
  next,
  className,
  fullWidth = false,
  hideTitle = false,
}) => {
  return (
    <main
      className={cn(
        'flex-1 flex flex-col',
        'px-8 py-8',
        'mr-64', // Account for fixed sidebar width (w-64 = 256px)
        'min-h-[calc(100vh-4rem)]', // Ensure minimum height for sticky footer
        className
      )}
    >
      <div className="w-full flex flex-col flex-1 min-h-0">
        <article className={cn(
          "w-full flex flex-col flex-1 min-h-0",
          fullWidth ? "max-w-full" : "max-w-3xl"
        )}>
          {!hideTitle && (
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {title}
            </h1>
          )}
          <div className="prose prose-gray max-w-none space-y-6 flex-1">
            {children}
          </div>
        </article>
        {/* Footer: Last updated, border, and navigation - Sticky to bottom */}
        <footer className={cn(
          "w-full mt-auto flex-shrink-0"
        )}>
          {lastUpdated && (
            <p className={cn(
              "text-sm text-gray-500 mb-4",
              !fullWidth && "max-w-3xl"
            )}>
              Last updated on {lastUpdated}
            </p>
          )}
          <div className="w-full pt-8 border-t border-gray-200">
            <DocNavigation previous={previous} next={next} />
          </div>
        </footer>
      </div>
    </main>
  );
});

DocContent.displayName = 'DocContent';

// Export CodeBlock for convenience
export { CodeBlock };

