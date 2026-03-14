import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

/**
 * List courses that are public. No auth required.
 * Returns id, title, course_code, and concept count for discovery.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const debug = url.searchParams.get("debug") === "1";

    const supabase = getSupabaseServerClient();

    // Fetch only public courses; higher limit when no search so new ones aren't cut off
    const limit = q.length > 0 ? 200 : 1000;
    let query = supabase
      .from("courses")
      .select("id, title, course_code, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (q.length > 0) {
      query = query.or(`title.ilike.%${q}%,course_code.ilike.%${q}%`);
    }

    let rawCourses: { id: string; title: string; course_code: string | null; created_at: string; is_public?: unknown }[] | null = null;
    let error: { message: string } | null = null;
    const result = await query;
    rawCourses = result.data ?? null;
    error = result.error;

    if (error) {
      return NextResponse.json(
        { error: "Failed to load public courses", details: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    let list = rawCourses ?? [];

    // If no search and we got zero from is_public=true, try fetching all and filtering in JS (handles type quirks)
    if (list.length === 0 && q.length === 0) {
      const fallback = await supabase
        .from("courses")
        .select("id, title, course_code, created_at, is_public")
        .order("created_at", { ascending: false })
        .limit(1000);
      const fallbackList = (fallback.data ?? []).filter(
        (c: { is_public?: unknown }) =>
          c.is_public === true || c.is_public === "true" || c.is_public === 1
      );
      if (fallbackList.length > 0) list = fallbackList;
    }
    const withCount = await Promise.all(
      list.map(async (c: { id: string; title: string; course_code: string | null }) => {
        const { count } = await supabase
          .from("concepts")
          .select("id", { count: "exact", head: true })
          .eq("course_id", c.id);
        return {
          id: c.id,
          title: c.title,
          course_code: c.course_code ?? "",
          concept_count: count ?? 0
        };
      })
    );

    const payload: { courses: typeof withCount; debug?: unknown } = { courses: withCount };
    if (debug) {
      payload.debug = {
        totalPublicFromDb: list.length,
        sample: list.slice(0, 5).map((r: { id: string; title?: string }) => ({ id: r.id, title: r.title }))
      };
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0"
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to load public courses", details: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
