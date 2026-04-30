/** Main-column fallback while docs page data (content + permissions) resolves. */
export function DocsContentSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="h-8 w-1/3 max-w-xs animate-pulse rounded-md bg-gray-100" />
      <div className="h-4 w-full max-w-2xl animate-pulse rounded-md bg-gray-50" />
      <div className="h-4 w-5/6 max-w-xl animate-pulse rounded-md bg-gray-50" />
      <div className="mt-6 min-h-[50vh] w-full animate-pulse rounded-lg bg-gray-50" />
    </div>
  );
}
