import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

const BodySchema = z.object({
  course_id: z.string().uuid(),
  filename: z.string().min(1).max(255).optional(),
  pasted_text: z.string().min(1).optional()
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = BodySchema.parse(json);

    if (!parsed.pasted_text) {
      return NextResponse.json(
        { error: "For this MVP, only pasted_text is supported." },
        { status: 400 }
      );
    }

    const supabase = supabaseBrowserClient();

    const { data, error } = await supabase
      .from("source_documents")
      .insert({
        course_id: parsed.course_id,
        filename: parsed.filename ?? "Pasted notes.txt",
        file_type: "text",
        storage_path: null,
        extracted_text: parsed.pasted_text
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to save source document" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { source_document_id: data.id },
      { status: 201 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to upload material" },
      { status: 500 }
    );
  }
}

