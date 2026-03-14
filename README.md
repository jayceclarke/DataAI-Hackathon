# CatchUp – Duolingo-style AI for missed classes

CatchUp turns dense class materials (slides, notes, syllabus text) into short daily micro-lessons so students can realistically catch up after falling behind.

## What it does

- **Upload one lecture** worth of text (paste from slides/notes).
- **LLM extracts concepts** and creates micro-lessons:
  - 1–2 sentence explanation
  - concrete example
  - 1 multiple choice quiz question
- **Daily session builder** serves a 5–10 minute session of unfinished concepts.
- **Gamification** tracks XP, streaks, and percent “caught up” per course.

## Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS
- Supabase (Postgres + optional Storage)
- OpenAI (or compatible) LLM with JSON responses

## Local setup

1. **Install dependencies**

```bash
npm install
```

2. **Configure Supabase**

- Create a new Supabase project.
- In SQL editor, create the schema for:
  - `courses`, `source_documents`, `concepts`, `lessons`, `quiz_questions`
  - `session_attempts`, `lesson_attempts`, `user_course_progress`
- You can paste the schema SQL you used during setup into a `schema.sql` file for reference.

3. **Environment variables**

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<your-project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"

OPENAI_API_KEY="<your-openai-key>"
OPENAI_MODEL="gpt-4.1-mini"
```

4. **Run the dev server**

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo flow (happy path)

1. **Landing page**
   - Go to `/`.
   - Hit **“View my progress”** or visit `/dashboard`.

2. **Create a course**
   - On `/dashboard`, click **“New course”**.
   - Fill in:
     - Course name (e.g. “Distributed Systems”)
     - Course code (e.g. “EECS 570”)
     - Daily goal (e.g. 10 minutes)
   - Submit → you’ll be redirected to the upload page.

3. **Upload one lecture**
   - On `/courses/[courseId]/upload`, paste the text from one lecture’s slides/notes.
   - Click **“Generate lessons”**.
   - The app:
     - Saves the text as a source document.
     - Calls the LLM to extract concepts and generate micro-lessons.
     - Saves concepts, lessons, and quiz questions to Supabase.
   - You’ll be redirected to the **Generated concepts** page.

4. **Review generated concepts**
   - On `/courses/[courseId]/concepts` you’ll see:
     - Concept title
     - Short summary
     - Difficulty + estimated minutes
   - Click **“Start today’s session”**.

5. **Complete today’s session**
   - On `/courses/[courseId]/session`:
     - See the current concept, explanation, example, and mini-exercise.
     - Answer the multiple-choice question and click **“Check answer”**.
     - Get immediate feedback and XP.
     - Click **“Next concept”** to move through the session.
   - After the last lesson, you’ll see a **Session complete** screen with total XP earned.

6. **Check progress**
   - From `/dashboard`, click into a course’s **Progress** page (`/courses/[courseId]/progress`).
   - See:
     - Concepts completed / total concepts
     - Percent “caught up”
     - Total XP and current streak
     - Quiz accuracy

## Notes

- Auth is intentionally skipped for the MVP; a fixed demo user id is used in API routes.
- PDF upload is not wired yet for reliability—demo uses **pasted text** only.
- The LLM is called server-side and expected to return strict JSON; if parsing fails, the app falls back to a heuristic paragraph-based splitter so the demo still works.
# DataAI-Hackathon