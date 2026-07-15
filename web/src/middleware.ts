import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/control-wp/login';
  const token = request.cookies.get('whatsi_admin_token')?.value;

  if (request.nextUrl.pathname.startsWith('/control-wp')) {
    if (!token && !isLoginPage) {
      return NextResponse.redirect(new URL('/control-wp/login', request.url));
    }
    if (token && isLoginPage) {
      return NextResponse.redirect(new URL('/control-wp', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/control-wp/:path*'],
};
