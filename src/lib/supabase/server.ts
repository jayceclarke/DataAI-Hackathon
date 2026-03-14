import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

/**
 * Create a Supabase client for the current request (Server Components, Route Handlers).
 * Uses cookies so auth state is available. Call getAuthUser() to require the current user.
 */
export async function createServerSupabase() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore: can happen in Server Components where set is not allowed
        }
      }
    }
  });
}

/**
 * Get the authenticated user from the current request.
 * Returns null if not signed in. Use in API routes and return 401 when null.
 */
export async function getAuthUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Get the authenticated user and Supabase client in one call (one client creation).
 * Returns null if not signed in. Use in API routes and return 401 when null.
 */
export async function getAuthUserAndSupabase(): Promise<{
  user: { id: string; email?: string };
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
} | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { user, supabase };
}
