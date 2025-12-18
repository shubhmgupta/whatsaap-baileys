import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    // Check if user has a token cookie
    const tokenCookie = request.cookies.get('token');
    
    if (!tokenCookie) {
      // No token, redirect to signin
      const url = request.nextUrl.clone();
      url.pathname = '/signin';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
