import { NextResponse, type NextRequest } from 'next/server';

/**
 * The admin's outer gate (ARCHITECTURE 6, D4D.24).
 *
 * DELIBERATELY SHALLOW. Middleware runs at the edge, without the database, so
 * all it can know is whether an admin cookie is present at all. That is
 * enough to send a stranger to the sign-in page before any admin code runs.
 * Whether the cookie is a LIVE session of an ENABLED staff member is decided
 * by every admin page and action itself (src/lib/admin/session.ts) - the
 * second layer is the one that actually holds.
 *
 * Every admin response also says noindex, whatever the site-wide setting.
 */

const ADMIN_COOKIE = 'jfl_admin';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === '/admin/login';

  if (!isLogin && !request.cookies.has(ADMIN_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
