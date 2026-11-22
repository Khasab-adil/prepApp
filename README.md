# AabPrepKarro AI — Your Personal AI Career Coach

**Tagline:** *Learn smarter. Prepare better. Get hired.*

AabPrepKarro AI is a persistent, adaptive AI career preparation platform built to help software developers close measurable skill gaps toward target engineering roles (pre-configured for a **Java Backend Developer · ₹9 LPA** track and extensible to any role).

---

## Architecture Overview

- **Frontend (`src/`)**: React 19, TypeScript, Vite, Tailwind CSS v4 (dual Light & Dark themes), React Router, and TanStack Query.
- **Backend API (`server.ts`, `server/`)**: Express + TypeScript server running on port `3000`, verifying Firebase Auth JWT ID tokens via `firebase-admin` on all `/api/ai/*` routes, enforcing per-user rate limiting and `zod` schema validation.
- **AI Integration (`server/aiService.ts`)**: Dedicated server-side `@google/genai` (`gemini-4-hydrogen`) service with structured JSON `responseSchema` enforcement, `zod` output validation, bounded retries with exponential backoff, and token usage tracking.
- **Database & Auth (`firebase-blueprint.json`, `firestore.rules`)**: Firebase Authentication (Google Sign-In) and Cloud Firestore with zero-trust user-isolated security rules under `/users/{userId}/...`.
- **Deterministic Readiness Engine (`src/lib/readiness.ts`)**: Computes Job Readiness transparently across 5 weighted criteria (Skill Matrix 35%, Verified Assessments 20%, Roadmap Completion 20%, Mock Interviews 15%, Coding & Projects 10%) and calculates daily study streaks from persisted activity logs.

---

## Modules Implemented

1. **Authentication & Career Profile (`/profile`)**: Google Sign-In, protected routes, full career profile (education, role, experience, skills, target role, `₹ LPA` target salary, daily study hours, preferred language, location, timeline).
2. **AI Skill Assessment (`/assessment`)**: Generates mixed MCQ and descriptive questions across Java Backend competencies, evaluates answers with transparent score-basis explanations, updates skill scores, and stores history.
3. **Intelligent Study Roadmap (`/roadmap`)**: Generates prerequisite-ordered 7, 30, 60, and 90-day roadmaps tailored to weak skills and job description gaps, with topic status tracking and direct scheduling into Today's Mission.
4. **Daily Study Planner (`/planner`)**: Manage today's study tasks, customize task durations, submit practice answers for AI evaluation, preserve completed history, and pull adaptive tasks from the active roadmap.
5. **Contextual AI Tutor (`/tutor`)**: Multi-level (`Beginner`, `Intermediate`, `Advanced`) explanations linked to the active roadmap phase with real-world examples, code snippets, line-by-line walkthroughs, and follow-up checks.
6. **Job Description Analyzer (`/job-analyzer`)**: Extracts requirements from pasted job descriptions and compares them honestly against the user's verified skill profile (`matching`, `partial`, `missing` skills).
7. **AI Mock Interviews (`/interviews`)**: Technical, Java, Spring Boot, SQL, DSA, System Design, HR, and Behavioral interviews with scoring on correctness and clarity, missing concepts, improved answers, and recurring weakness tracking.
8. **Java Coding Practice (`/coding`)**: Curated backend Java coding challenges with examples, hints, expected concepts, and safe static AI code review (complexity, edge cases, improvement suggestions).
9. **Portfolio Project Builder (`/projects`)**: AI-recommended backend project blueprints with architecture guidance, database design, API specs, interactive milestones, testing/deployment checklists, and resume bullets.
10. **Career Progress & Settings (`/progress`, `/settings`)**: Transparent readiness breakdown, full 17-skill matrix, streak telemetry, light/dark theme toggle, and AI token tracking.

---

## Environment Variables

Configure via `.env` (never commit secrets; see `.env.example`):

- `GEMINI_API_KEY`: Server-side Gemini API key (never exposed to the client bundle).
- `APP_URL`: Hosted application URL.

---

## Commands

```bash
# Install dependencies
npm install

# Run full-stack development server (Express + Vite on port 3000)
npm run dev

# Type-check TypeScript
npm run lint

# Run unit tests
npm test

# Build frontend production bundle
npm run build
```
