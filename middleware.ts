import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value
  const role = request.cookies.get('role')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // роль может быть 'library' или 'staff'
  const isAdmin = role === 'admin'
  const isStaff = role === 'library' || role === 'staff'

  // Only admin and staff can access the panel
  if (!isAdmin && !isStaff) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/staff/dashboard', request.url))
  }

  if (pathname === '/dashboard' && isStaff) {
    return NextResponse.redirect(new URL('/staff/dashboard', request.url))
  }

  if (pathname.startsWith('/staff') && !isStaff) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}