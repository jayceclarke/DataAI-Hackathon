"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function AuthHeader() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string } | null>(undefined);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (user === undefined) {
    return null;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-[140px] truncate text-xs text-slate-400 sm:max-w-[200px]">
          {user.email}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/80"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/80"
    >
      Sign in
    </Link>
  );
}
