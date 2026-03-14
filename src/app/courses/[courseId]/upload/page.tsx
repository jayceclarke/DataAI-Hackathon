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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const useFile = selectedFile && selectedFile.size > 0;
    if (!useFile && !pastedText.trim()) {
      setError("Choose a PDF or paste your slides or notes.");
      return;
    }

    setLoading(true);

    try {
      let uploadData: { source_document_id?: string; error?: string };
      if (useFile) {
        const formData = new FormData();
        formData.set("course_id", courseId);
        formData.set("filename", filename.trim() || selectedFile!.name);
        formData.set("file", selectedFile!);
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          setError(uploadData.error ?? "Failed to upload PDF.");
          setLoading(false);
          return;
        }
      } else {
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course_id: courseId,
            filename: filename.trim() || "Pasted notes.txt",
            pasted_text: pastedText
          })
        });
        uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          setError(uploadData.error ?? "Failed to upload material.");
          setLoading(false);
          return;
        }
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
          {isSupplement ? "Add more slides or notes" : "Upload slides or notes"}
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          {isSupplement
            ? "Upload another PDF and we'll add new concepts to this course."
            : "Upload a PDF of your lecture slides or notes. We'll extract the text and generate bite-sized lessons you can study in a few minutes a day."}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl bg-slate-950/70 py-16 ring-1 ring-slate-800/80">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400"
            aria-hidden
          />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-200">
              Uploading & generating concepts…
            </p>
            <p className="mt-1 text-xs text-slate-500">
              This usually takes 30–60 seconds. Don’t close this page.
            </p>
          </div>
        </div>
      ) : (
      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-4 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80"
      >
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">
            Your file (PDF)
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/50 px-4 py-4 text-sm text-slate-200 transition hover:border-brand-500/60 hover:bg-slate-800/80">
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <span className="font-medium">
                {selectedFile ? selectedFile.name : "Choose slides or notes (PDF)"}
              </span>
            </label>
            {selectedFile && (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Remove file
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Lecture slides, study notes, or syllabus PDFs work. We pull out the text and turn it into short lessons.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">
            Label for this material
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
            Or paste text instead
          </label>
          <textarea
            className="h-32 w-full resize-none rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-60"
            placeholder="If you don't have a PDF, paste your slides or notes here…"
            value={pastedText}
            onChange={event => setPastedText(event.target.value)}
            disabled={!!(selectedFile && selectedFile.size > 0)}
          />
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-400">{error}</p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-brand-500/40 transition hover:bg-brand-400"
          >
            {isSupplement
              ? "Add lessons from this material"
              : "Generate lessons from this file"}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}

