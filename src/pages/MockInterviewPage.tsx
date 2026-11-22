import React, { useState } from 'react';
import { MessageSquare, Play, Send } from 'lucide-react';
import { useCareerData } from '../hooks/useCareerData.ts';
import { callAiApi } from '../lib/apiClient.ts';
import { completeMockInterview, createMockInterview, logStudyActivity } from '../lib/firestoreRepo.ts';
import { getTodayIsoDate } from '../lib/readiness.ts';
import { InterviewQAItem, MockInterview } from '../types/career.ts';
import { ErrorBanner, LoadingRows } from '../components/DataState.tsx';

const INTERVIEW_TRACKS = [
  'Technical',
  'Java',
  'Spring Boot',
  'SQL',
  'DSA',
  'System Design',
  'HR',
  'Behavioral',
];

const DIFFICULTIES = ['Junior', 'Mid-Level (₹9 LPA)', 'Senior'];

export function MockInterviewPage() {
  const { uid, profile, skills, mockInterviews, isLoading, invalidate } = useCareerData();

  const [track, setTrack] = useState('Java');
  const [difficulty, setDifficulty] = useState('Mid-Level (₹9 LPA)');
  const [activeSession, setActiveSession] = useState<MockInterview | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingRows rows={6} />;
  }

  const recurringWeaknesses = Array.from(
    new Set(mockInterviews.flatMap((m) => m.recurringWeaknesses || []))
  ).slice(0, 8);

  const handleStartInterview = async () => {
    if (!uid || !profile) return;
    setGenerating(true);
    setErrorMsg(null);
    try {
      const weakAreas = [...skills]
        .sort((a, b) => a.score - b.score)
        .slice(0, 4)
        .map((s) => s.name);

      const { data, tokensUsed } = await callAiApi<{
        questions: { id: string; category: string; question: string }[];
      }>('/api/ai/interview/generate', {
        track,
        difficulty,
        targetRole: profile.targetRole,
        targetSalaryLpa: profile.targetSalaryLpa,
        weakAreas,
      });

      const qaItems: InterviewQAItem[] = data.questions.map((q) => ({
        id: q.id,
        category: q.category,
        question: q.question,
        userAnswer: '',
        technicalScore: 0,
        clarityScore: 0,
        feedback: '',
        missingConcepts: [],
        improvedAnswer: '',
      }));

      const newId = await createMockInterview(uid, {
        track,
        difficulty,
        status: 'in_progress',
        overallScore: 0,
        recurringWeaknesses: [],
        improvementPlan: [],
        qaItems,
      });

      await logStudyActivity(uid, {
        date: getTodayIsoDate(),
        minutesStudied: 0,
        tasksCompleted: 0,
        aiTokensUsed: tokensUsed,
        actionType: 'mock_interview_started',
        note: `Started ${track} mock interview`,
      });

      setAnswers({});
      setActiveSession({
        id: newId,
        uid,
        track,
        difficulty,
        status: 'in_progress',
        overallScore: 0,
        recurringWeaknesses: [],
        improvementPlan: [],
        qaItems,
      });
      invalidate('mockInterviews');
      invalidate('activityLogs');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start mock interview.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !profile || !activeSession) return;
    setEvaluating(true);
    setErrorMsg(null);
    try {
      const payloadItems = activeSession.qaItems.map((q) => ({
        id: q.id,
        category: q.category,
        question: q.question,
        userAnswer: answers[q.id] || 'No answer provided.',
      }));

      const { data, tokensUsed } = await callAiApi<{
        overallScore: number;
        recurringWeaknesses: string[];
        improvementPlan: string[];
        evaluations: {
          id: string;
          technicalScore: number;
          clarityScore: number;
          feedback: string;
          missingConcepts: string[];
          improvedAnswer: string;
        }[];
      }>('/api/ai/interview/evaluate', {
        track: activeSession.track,
        difficulty: activeSession.difficulty,
        targetRole: profile.targetRole,
        qaItems: payloadItems,
      });

      const mergedItems: InterviewQAItem[] = activeSession.qaItems.map((q) => {
        const ev = data.evaluations.find((item) => item.id === q.id);
        return {
          ...q,
          userAnswer: answers[q.id] || '',
          technicalScore: Math.round(ev?.technicalScore ?? 0),
          clarityScore: Math.round(ev?.clarityScore ?? 0),
          feedback: ev?.feedback ?? '',
          missingConcepts: ev?.missingConcepts ?? [],
          improvedAnswer: ev?.improvedAnswer ?? '',
        };
      });

      await completeMockInterview(uid, activeSession.id, {
        status: 'completed',
        overallScore: Math.round(data.overallScore),
        recurringWeaknesses: data.recurringWeaknesses,
        improvementPlan: data.improvementPlan,
        qaItems: mergedItems,
      });

      await logStudyActivity(uid, {
        date: getTodayIsoDate(),
        minutesStudied: 25,
        tasksCompleted: 1,
        aiTokensUsed: tokensUsed,
        actionType: 'mock_interview_completed',
        note: `Completed ${activeSession.track} interview (${Math.round(data.overallScore)}/100)`,
      });

      setActiveSession({
        ...activeSession,
        status: 'completed',
        overallScore: Math.round(data.overallScore),
        recurringWeaknesses: data.recurringWeaknesses,
        improvementPlan: data.improvementPlan,
        qaItems: mergedItems,
      });
      invalidate('mockInterviews');
      invalidate('activityLogs');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to evaluate mock interview.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          AI Mock Interviews
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Practice written technical, system design, and behavioral rounds with detailed scoring on technical correctness, clarity, and missing concepts.
        </p>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {!activeSession && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Interview Track
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {INTERVIEW_TRACKS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrack(t)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      track === t
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Round Depth
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      difficulty === d
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              4 structured questions · Written response format
            </span>
            <button
              type="button"
              onClick={handleStartInterview}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              <span>{generating ? 'Preparing Panel...' : `Start ${track} Interview`}</span>
            </button>
          </div>
        </section>
      )}

      {activeSession && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                {activeSession.track} Interview · {activeSession.difficulty}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Status: {activeSession.status === 'completed' ? 'Evaluated' : 'In Progress'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSession(null)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Back to Setup
            </button>
          </div>

          {activeSession.status === 'completed' ? (
            <div className="mt-5 space-y-6">
              <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Overall Score</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {activeSession.overallScore}/100
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Weaknesses Flagged</p>
                  <ul className="mt-1 space-y-1 text-xs text-amber-700 dark:text-amber-400">
                    {activeSession.recurringWeaknesses.map((w, i) => (
                      <li key={i}>· {w}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Improvement Plan</p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {activeSession.improvementPlan.map((p, i) => (
                      <li key={i}>· {p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {activeSession.qaItems.map((item, idx) => (
                  <div key={item.id} className="space-y-3 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Question {idx + 1} · {item.category}
                      </span>
                      <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        Technical {item.technicalScore}/100 · Clarity {item.clarityScore}/100
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.question}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Your answer: {item.userAnswer || '—'}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{item.feedback}</p>
                    {item.missingConcepts.length > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Missing concepts: {item.missingConcepts.join(', ')}
                      </p>
                    )}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Model / Improved Answer</p>
                      <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">{item.improvedAnswer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitAnswers} className="mt-5 space-y-5">
              {activeSession.qaItems.map((item, idx) => (
                <div key={item.id} className="border-b border-slate-200 pb-5 last:border-b-0 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Question {idx + 1} · {item.category}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{item.question}</p>
                  <textarea
                    rows={4}
                    value={answers[item.id] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="Structure your explanation clearly with trade-offs, edge cases, and real backend examples..."
                    className="mt-2.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              ))}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={evaluating}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  <span>{evaluating ? 'Evaluating Responses...' : 'Submit Interview Answers'}</span>
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Recurring Weaknesses + History */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Recurring Weaknesses
          </h3>
          {recurringWeaknesses.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Complete mock interviews to surface repeated concept gaps across sessions.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {recurringWeaknesses.map((w, i) => (
                <li key={i}>· {w}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-8 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Interview History
          </h3>
          {mockInterviews.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              No mock interviews completed yet.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
              {mockInterviews.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {session.track} · {session.difficulty}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {session.qaItems.length} questions · {session.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {session.status === 'completed' ? `${session.overallScore}/100` : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSession(session)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {session.status === 'completed' ? 'Review' : 'Resume'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
