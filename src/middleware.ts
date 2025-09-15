import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Check for preview URLs
  const isPreview = searchParams.get('preview') === 'true';
  const isArticleRoute = pathname.startsWith('/articles/') && pathname !== '/articles';

  // Only check authentication for protected routes
  const protectedRoutes = ['/admin', '/profile'];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Handle preview URLs - require authentication
  if (isArticleRoute && isPreview) {
    try {
      const session = await auth();

      // If no session for preview, redirect to login
      if (!session?.user) {
        return NextResponse.redirect(new URL('/?login=true', request.url));
      }
    } catch {
      // If auth check fails, redirect to login
      return NextResponse.redirect(new URL('/?login=true', request.url));
    }
  }

  if (isProtectedRoute) {
    try {
      const session = await auth();

      // If no session, let the client-side handle the redirect
      // This prevents server-side redirects that interfere with client-side auth state
      if (!session?.user) {
        return NextResponse.next();
      }

      // Admin routes require admin role only
      if (pathname.startsWith('/admin')) {
        const userRole = session.user.role;
        if (userRole !== 'admin') {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    } catch {
      // If auth check fails, let client-side handle it
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
