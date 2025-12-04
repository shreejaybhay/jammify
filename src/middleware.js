import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Public routes (auth pages) - accessible when NOT logged in
  const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

  // Private routes - require authentication
  const privateRoutes = ["/music", "/profile", "/settings"];

  // Also protect dynamic routes that start with these paths
  const ismusicRoute = pathname.startsWith("/music/");
  const isProfileRoute = pathname.startsWith("/profile/");
  const isSettingsRoute = pathname.startsWith("/settings/");

  // User is NOT logged in
  if (!token) {
    if (privateRoutes.includes(pathname) || ismusicRoute || isProfileRoute || isSettingsRoute) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // User IS logged in
  if (token) {
    if (publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL("/music", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/music/:path*",
    "/profile/:path*",
    "/settings/:path*"
  ],
};