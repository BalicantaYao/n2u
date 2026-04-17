import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// TEMPORARY: hardcoded for debugging. MUST revert and rotate.
const HARDCODED_SECRET = "3396dabe1f441db68aec8e04c1bc1bf4";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: HARDCODED_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api/auth|api/health|_next/static|_next/image|favicon.ico).*)",
  ],
};
