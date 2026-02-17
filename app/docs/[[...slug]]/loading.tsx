/**
 * Shown while the docs page (RSC payload) is loading.
 * Gives instant feedback on navigation so the UI doesn't feel frozen
 * while the server runs cached nav + page content fetch.
 */
export default function DocsLoading() {
  return (
    <div className="animate-pulse flex flex-col gap-4 p-6 max-w-4xl mx-auto">
      <div className="h-9 bg-muted rounded w-3/4 max-w-xl" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-5/6" />
      <div className="h-4 bg-muted rounded w-4/6 mt-4" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-full" />
    </div>
  );
}
