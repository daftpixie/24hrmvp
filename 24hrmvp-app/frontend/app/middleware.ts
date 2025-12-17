import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/profile', '/submit', '/vote', 
  '/grid/chat', '/grid/forum', '/grid/live'
];

const AUTH_ROUTES = ['/auth/login', '/auth/signin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  const hasSession = !!sessionCookie?.value;

  // 1. Skip all internal Next.js and API paths early
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Handle Protected Routes [web:3]
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('auth_required', 'true'); // Friendly parameter
    return NextResponse.redirect(loginUrl);
  }

  // 3. Handle Auth Routes (Redirect to home if already logged in)
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 4. Pass session state to client headers for easy access
  const response = NextResponse.next();
  if (hasSession) {
    response.headers.set('x-session-active', 'true');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
