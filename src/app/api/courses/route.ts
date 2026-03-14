import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

const CreateCourseSchema = z.object({
  title: z.string().min(1).max(200),
  course_code: z.string().max(50).optional(),
  daily_goal_minutes: z.number().int().min(5).max(60).optional()
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = CreateCourseSchema.parse(json);

    const supabase = getSupabaseServerClient();

    const userId = "demo-user";

    const { data, error } = await supabase
      .from("courses")
      .insert({
        user_id: userId,
        title: parsed.title,
        course_code: parsed.course_code,
        daily_goal_minutes: parsed.daily_goal_minutes ?? 10
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to create course" },
        { status: 500 }
      );
    }

    return NextResponse.json({ course_id: data.id }, { status: 201 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}

