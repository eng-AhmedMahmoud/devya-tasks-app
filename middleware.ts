import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'devya_session';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }
  const hasSession = Boolean(req.cookies.get(COOKIE_NAME)?.value);
  if (hasSession) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!api|_next|favicon|.*\\..*).*)'] };
