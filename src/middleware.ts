import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

const PROTECTED_PREFIXES = ["/dashboard", "/courses", "/discover"];
const AUTH_ROUTES = ["/login", "/signup"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      }
    }
  });

  // Refresh session if expired; updates cookies on response
  await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (isProtected(pathname)) {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }

  if (isAuthRoute(pathname)) {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      const next = request.nextUrl.searchParams.get("next") || "/dashboard";
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)"
  ]
};
