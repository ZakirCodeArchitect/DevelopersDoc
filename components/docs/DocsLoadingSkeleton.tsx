"use client";

/**
 * Skeleton UI for docs page loading. Used by:
 * - loading.tsx (route-level loading)
 * - NavigationContext (client-side navigation between docs)
 */
export function DocsLoadingSkeleton() {
  return (
    <div className="flex flex-1 w-full min-h-[calc(100vh-4rem)]">
      <main
        className="flex-1 flex flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 mr-0 lg:mr-64 min-h-[calc(100vh-4rem)]"
        aria-hidden
      >
        <div className="w-full flex flex-col flex-1 min-h-0">
          <article className="w-full flex flex-col flex-1 min-h-0 max-w-7xl">
            <div className="h-10 bg-gray-200 rounded-lg w-3/4 max-w-xl mb-4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-full max-w-2xl mb-8 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-56 mb-4 animate-pulse" />
            <div className="space-y-2 mb-6">
              <div className="h-4 bg-gray-200 rounded w-full max-w-md animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-full max-w-sm animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-72 animate-pulse" />
            </div>
            <div className="h-6 bg-gray-200 rounded w-24 mb-4 animate-pulse" />
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 rounded w-4 shrink-0 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded flex-1 max-w-xl animate-pulse" />
                <div className="h-5 bg-gray-200 rounded-full w-24 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 rounded w-4 shrink-0 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-3/4 max-w-md animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 rounded w-4 shrink-0 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-full max-w-lg animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 rounded w-4 shrink-0 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-5/6 max-w-2xl animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 rounded w-4 shrink-0 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-4/5 max-w-md animate-pulse" />
              </div>
            </div>
            <footer className="w-full mt-auto flex-shrink-0">
              <div className="h-4 bg-gray-200 rounded w-48 max-w-7xl animate-pulse" />
              <div className="w-full pt-8 mt-4 border-t border-gray-200">
                <div className="flex justify-between gap-4">
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                </div>
              </div>
            </footer>
          </article>
        </div>
      </main>
      <aside
        className="hidden lg:flex w-64 border-l border-gray-200 bg-gray-50 fixed right-0 top-16 h-[calc(100vh-4rem)] flex-col flex-shrink-0"
        aria-hidden
      >
        <div className="flex flex-col h-full">
          <div className="p-6 pb-0 flex-1 overflow-y-auto">
            <div className="h-4 bg-gray-200 rounded w-28 mb-4 animate-pulse" />
            <nav className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            </nav>
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="h-4 bg-gray-200 rounded w-14 mb-4 animate-pulse" />
              <div className="space-y-1">
                <div className="h-8 bg-gray-200 rounded-md w-full animate-pulse" />
              </div>
            </div>
          </div>
          <div className="mt-auto p-6 pt-8 border-t border-gray-200 flex-shrink-0 bg-gray-50 space-y-3">
            <div className="h-10 bg-gray-200 rounded-md w-full animate-pulse" />
            <div className="h-10 bg-gray-200 rounded-md w-full animate-pulse" />
            <div className="h-10 bg-gray-200 rounded-md w-full animate-pulse" />
            <div className="h-10 bg-gray-200 rounded-md w-full animate-pulse" />
          </div>
        </div>
      </aside>
    </div>
  );
}
