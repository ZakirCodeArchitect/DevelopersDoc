/** Full-route fallback while docs shell (nav + layout client) resolves. */
export function DocsRouteLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="h-16 w-full animate-pulse border-b border-gray-100 bg-gray-50" />
      <div className="flex flex-1">
        <div className="hidden w-64 shrink-0 animate-pulse border-r border-gray-100 bg-gray-50 md:block" />
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="h-8 w-1/3 max-w-xs animate-pulse rounded-md bg-gray-100" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded-md bg-gray-50" />
          <div className="h-4 w-5/6 max-w-xl animate-pulse rounded-md bg-gray-50" />
          <div className="mt-8 min-h-[40vh] w-full animate-pulse rounded-lg bg-gray-50" />
        </div>
      </div>
    </div>
  );
}
