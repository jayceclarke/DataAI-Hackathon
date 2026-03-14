"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function CourseUploadPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.courseId;
  const isSupplement = searchParams.get("supplement") === "1";

  const [pastedText, setPastedText] = useState("");
  const [filename, setFilename] = useState("Lecture notes");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!pastedText) {
      setError("Paste some content from a lecture or syllabus.");
      return;
    }

    setLoading(true);

    try {
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          filename,
          pasted_text: pastedText
        })
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setError(uploadData.error ?? "Failed to upload material.");
        setLoading(false);
        return;
      }

      const processResponse = await fetch("/api/process-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          source_document_id: uploadData.source_document_id
        })
      });

      const processData = await processResponse.json();

      if (!processResponse.ok) {
        setError(processData.error ?? "Failed to process course.");
        setLoading(false);
        return;
      }

      router.push(`/courses/${courseId}/progress`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError("Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6">
      <div>
        {isSupplement && (
          <Link
            href={`/courses/${courseId}/progress`}
            className="text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            ← Back to progress
          </Link>
        )}
        <h1 className="mt-1 text-2xl font-semibold text-slate-50">
          {isSupplement ? "Add supplemental material" : "Upload materials"}
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          {isSupplement
            ? "Paste more lecture notes or slides. New concepts will be added to this course."
            : "For the MVP, paste one lecture's notes or slides text. We'll turn it into concepts and micro-lessons."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-4 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80"
      >
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">
            Material label
          </label>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="e.g. Lecture 7 – Cache Coherence"
            value={filename}
            onChange={event => setFilename(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">
            Paste syllabus or lecture text
          </label>
          <textarea
            className="h-56 w-full resize-none rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="Paste the text from the PDF or slides here…"
            value={pastedText}
            onChange={event => setPastedText(event.target.value)}
          />
          <p className="text-xs text-slate-500">
            In a full version, you&apos;d upload PDFs here. For the hackathon
            demo this keeps things simple and reliable.
          </p>
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-400">{error}</p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-brand-500/40 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Generating lessons…"
              : isSupplement
                ? "Add concepts from this material"
                : "Generate lessons"}
          </button>
        </div>
      </form>
    </div>
  );
}

