import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

const ParamsSchema = z.object({
  courseId: z.string().uuid()
});

export async function GET(
  _request: Request,
  context: { params: { courseId: string } }
) {
  const parsed = ParamsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("concepts")
      .select(
        "id, title, summary, difficulty, estimated_minutes, order_index"
      )
      .eq("course_id", parsed.data.courseId)
      .order("order_index", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load concepts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ concepts: data ?? [] });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load concepts" },
      { status: 500 }
    );
  }
}

