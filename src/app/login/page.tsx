"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam !== "/courses/new" ? nextParam : "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const supabase = createBrowserSupabase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
        return;
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong."
      });
    } finally {
      setLoading(false);
    }
  };

  const authError = searchParams.get("error") === "auth";

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center">
      <div className="rounded-2xl bg-slate-950/70 p-6 ring-1 ring-slate-800/80">
        <h1 className="text-xl font-semibold text-slate-50">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {mode === "signin"
            ? "Sign in to access your courses and progress."
            : "Sign up to start catching up with CatchUp."}
        </p>

        {(authError || message) && (
          <div
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              (message?.type === "error" || authError)
                ? "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30"
                : "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
            }`}
          >
            {authError ? "Authentication failed. Try again." : message?.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-slate-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-slate-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode === "signup" ? true : undefined}
              minLength={mode === "signup" ? 6 : undefined}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="••••••••"
            />
            {mode === "signup" && (
              <p className="mt-1 text-[11px] text-slate-500">At least 6 characters</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-brand-500/40 transition hover:bg-brand-400 disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-medium text-brand-300 hover:text-brand-200"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-medium text-brand-300 hover:text-brand-200"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      <p className="mt-4 text-center">
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-400">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
