import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserAndSupabase } from "@/lib/supabase/server";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const { getDocument } = await import("pdfjs-serverless");
  const document = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true
  }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i);
    const textContent = await page.getTextContent();
    const text = (textContent.items as { str?: string }[])
      .map((item) => item.str ?? "")
      .join(" ");
    parts.push(text);
  }
  await document.destroy();
  return parts.join("\n\n").trim();
}

export async function POST(request: Request) {
  const auth = await getAuthUserAndSupabase();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { user, supabase } = auth;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let courseId: string;
    let filename: string;
    let extractedText: string;
    let fileType: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const cid = formData.get("course_id");
      const label = formData.get("filename");

      if (!file || typeof cid !== "string") {
        return NextResponse.json(
          { error: "Missing file or course_id." },
          { status: 400 }
        );
      }
      courseId = cid.trim();
      filename = (label && typeof label === "string" ? label.trim() : null) ?? (file.name || "Upload.pdf");

      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json(
          { error: "PDF must be 10 MB or smaller." },
          { status: 400 }
        );
      }
      const type = file.type.toLowerCase();
      if (type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: "Only PDF files are supported for file upload." },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      try {
        extractedText = await extractTextFromPdf(buffer);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("PDF extraction failed", err);
        return NextResponse.json(
          { error: "Could not read the PDF. Try pasting the text from the file instead, or use a different PDF." },
          { status: 400 }
        );
      }
      fileType = "pdf";

      if (!extractedText || extractedText.length < 50) {
        return NextResponse.json(
          { error: "Could not extract enough text from the PDF. Try pasting the text instead, or use a different PDF." },
          { status: 400 }
        );
      }
    } else {
      const BodySchema = z.object({
        course_id: z.string().uuid(),
        filename: z.string().min(1).max(255).optional(),
        pasted_text: z.string().min(1).optional()
      });
      const json = await request.json();
      const parsed = BodySchema.parse(json);
      if (!parsed.pasted_text) {
        return NextResponse.json(
          { error: "Provide either a PDF file (multipart) or pasted_text (JSON)." },
          { status: 400 }
        );
      }
      courseId = parsed.course_id;
      filename = parsed.filename ?? "Pasted notes.txt";
      extractedText = parsed.pasted_text;
      fileType = "text";
    }

    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .single();
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("source_documents")
      .insert({
        course_id: courseId,
        filename,
        file_type: fileType,
        storage_path: null,
        extracted_text: extractedText
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

