import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // In our No-Signup Concept ERP, login and signup are removed.
  // Anyone accessing auth routes is redirected directly to the dashboard.
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Seamless Open Workspace access to all routes without requiring login/signup
  return NextResponse.next({ request });
}
