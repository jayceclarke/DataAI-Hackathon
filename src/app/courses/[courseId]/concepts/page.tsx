import Link from "next/link";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

type ConceptRow = {
  id: string;
  title: string;
  summary: string;
  difficulty: string;
  estimated_minutes: number;
  order_index: number;
};

async function loadConcepts(courseId: string): Promise<ConceptRow[]> {
  const supabase = supabaseBrowserClient();

  const { data, error } = await supabase
    .from("concepts")
    .select(
      "id, title, summary, difficulty, estimated_minutes, order_index"
    )
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (error || !data) return [];
  return data as ConceptRow[];
}

export default async function ConceptsPage({
  params
}: {
  params: { courseId: string };
}) {
  const concepts = await loadConcepts(params.courseId);

  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">
            Generated concepts
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            This is what the AI pulled out of your upload. Each concept is a
            tiny lesson in today's session.
          </p>
        </div>
        <Link
          href={`/courses/${params.courseId}/session`}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-brand-500/40 hover:bg-brand-400"
        >
          Start today's session
        </Link>
      </div>

      {concepts.length === 0 ? (
        <div className="rounded-2xl bg-slate-950/70 p-4 text-sm text-slate-300 ring-1 ring-slate-800/80">
          No concepts yet. Try re-uploading or processing the course again.
        </div>
      ) : (
        <div className="space-y-3">
          {concepts.map(concept => (
            <div
              key={concept.id}
              className="rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-50">
                    {concept.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-300">
                    {concept.summary}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-400">
                  <p className="capitalize">{concept.difficulty}</p>
                  <p>{concept.estimated_minutes} min</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

