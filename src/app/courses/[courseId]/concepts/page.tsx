import { redirect } from "next/navigation";

export default function ConceptsRedirectPage({
  params
}: {
  params: { courseId: string };
}) {
  redirect(`/courses/${params.courseId}/progress`);
}
