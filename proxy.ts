import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/** Public HTML routes (also excluded from matcher — no edge auth work). */
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

/**
 * Public API routes must skip auth.protect() so webhooks and published feeds work.
 * All other /api/* requests still run through middleware and require a session.
 */
const isPublicApiRoute = createRouteMatcher([
  '/api/webhooks(.*)',
  '/api/published(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith('/api/') && isPublicApiRoute(req)) {
    return;
  }
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Docs app + APIs only — skips `/`, auth pages, redirects, and static assets
    '/docs/:path*',
    '/api/:path*',
  ],
};
