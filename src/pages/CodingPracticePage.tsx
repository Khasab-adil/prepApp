import React, { useState } from 'react';
import { CheckCircle2, Code2, Lightbulb, Send } from 'lucide-react';
import { JAVA_CODING_PROBLEMS } from '../data/seedCurriculum.ts';
import { useCareerData } from '../hooks/useCareerData.ts';
import { callAiApi } from '../lib/apiClient.ts';
import { createCodingSubmission, logStudyActivity } from '../lib/firestoreRepo.ts';
import { getTodayIsoDate } from '../lib/readiness.ts';
import { CodingSubmission } from '../types/career.ts';
import { ErrorBanner, LoadingRows } from '../components/DataState.tsx';

export function CodingPracticePage() {
  const { uid, codingSubmissions, isLoading, invalidate } = useCareerData();

  const [selectedId, setSelectedId] = useState(JAVA_CODING_PROBLEMS[0].id);
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [showHints, setShowHints] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [latestEval, setLatestEval] = useState<CodingSubmission | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingRows rows={6} />;
  }

  const filteredProblems = JAVA_CODING_PROBLEMS.filter(
    (p) => difficultyFilter === 'All' || p.difficulty === difficultyFilter
  );
  const problem =
    JAVA_CODING_PROBLEMS.find((p) => p.id === selectedId) || JAVA_CODING_PROBLEMS[0];
  const currentCode = codeMap[problem.id] ?? problem.starterCode;

  const problemHistory = codingSubmissions.filter((s) => s.problemId === problem.id);

  const handleSubmitCode = async () => {
    if (!uid) return;
    if (currentCode.trim().length < 20) {
      setErrorMsg('Write your Java implementation before submitting for review.');
      return;
    }

    setEvaluating(true);
    setErrorMsg(null);
    try {
      const { data, tokensUsed } = await callAiApi<{
        status: 'passed' | 'needs_improvement';
        score: number;
        timeComplexity: string;
        spaceComplexity: string;
        aiFeedback: string;
        edgeCasesMissed: string[];
        improvedApproach: string;
      }>('/api/ai/coding/evaluate', {
        problemTitle: problem.title,
        statement: problem.statement,
        expectedConcepts: problem.expectedConcepts,
        code: currentCode,
      });

      const submissionPayload: Omit<CodingSubmission, 'id' | 'uid' | 'createdAt' | 'updatedAt'> = {
        problemId: problem.id,
        problemTitle: problem.title,
        difficulty: problem.difficulty,
        language: 'Java',
        code: currentCode,
        status: data.status,
        score: Math.round(data.score),
        timeComplexity: data.timeComplexity,
        spaceComplexity: data.spaceComplexity,
        aiFeedback: data.aiFeedback,
        edgeCasesMissed: data.edgeCasesMissed,
        improvedApproach: data.improvedApproach,
      };

      const newId = await createCodingSubmission(uid, submissionPayload);
      await logStudyActivity(uid, {
        date: getTodayIsoDate(),
        minutesStudied: 20,
        tasksCompleted: data.status === 'passed' ? 1 : 0,
        aiTokensUsed: tokensUsed,
        actionType: 'coding_submission',
        note: `${problem.title}: ${data.status} (${Math.round(data.score)}/100)`,
      });

      setLatestEval({ id: newId, uid, ...submissionPayload });
      invalidate('codingSubmissions');
      invalidate('activityLogs');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Code evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Java Coding Practice
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Solve backend-oriented Java challenges with complexity analysis, edge-case checks, and AI static code review.
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {(['All', 'Easy', 'Medium', 'Hard'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setDifficultyFilter(lvl)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                difficultyFilter === lvl
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Problem List */}
        <aside className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="border-b border-slate-200 pb-3 font-display text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
            Java Problem Set
          </h3>
          <div className="mt-3 space-y-1.5">
            {filteredProblems.map((item) => {
              const solved = codingSubmissions.some(
                (s) => s.problemId === item.id && s.status === 'passed'
              );
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setLatestEval(null);
                    setShowHints(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                    problem.id === item.id
                      ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{item.title}</span>
                    {solved && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {item.difficulty} · {item.topic}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Problem Statement + Editor */}
        <section className="space-y-5 lg:col-span-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {problem.difficulty} · {problem.topic}
                </p>
                <h3 className="mt-0.5 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  {problem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHints((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span>{showHints ? 'Hide Hints' : 'Show Hints'}</span>
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {problem.statement}
            </p>

            <div className="mt-4 space-y-2">
              {problem.examples.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-800 dark:bg-slate-950"
                >
                  <p className="text-slate-700 dark:text-slate-300">Input: {ex.input}</p>
                  <p className="mt-1 text-slate-900 dark:text-slate-100">Output: {ex.output}</p>
                  <p className="mt-1 font-sans text-slate-500 dark:text-slate-400">{ex.explanation}</p>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Expected concepts: {problem.expectedConcepts.join(' · ')}
            </p>

            {showHints && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <ul className="list-disc space-y-1 pl-4">
                  {problem.hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Code2 className="h-4 w-4" />
                  Java Solution Editor
                </label>
                <button
                  type="button"
                  onClick={() => setCodeMap((prev) => ({ ...prev, [problem.id]: problem.starterCode }))}
                  className="text-xs text-slate-500 hover:underline dark:text-slate-400"
                >
                  Reset starter code
                </button>
              </div>
              <textarea
                rows={12}
                value={currentCode}
                onChange={(e) => setCodeMap((prev) => ({ ...prev, [problem.id]: e.target.value }))}
                spellCheck={false}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-950 p-3.5 font-mono text-xs leading-relaxed text-slate-100 focus:border-blue-500 focus:outline-none dark:border-slate-700"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Evaluated safely via static AI code review (no arbitrary code executed in server process).
              </span>
              <button
                type="button"
                onClick={handleSubmitCode}
                disabled={evaluating}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
              >
                <Send className="h-4 w-4" />
                <span>{evaluating ? 'Reviewing Code...' : 'Submit for AI Review'}</span>
              </button>
            </div>
          </div>

          {latestEval && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
                <h4 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Review Result: {latestEval.status === 'passed' ? 'Passed' : 'Needs Improvement'}
                </h4>
                <span className="font-mono text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                  Score: {latestEval.score}/100
                </span>
              </div>

              <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Time Complexity: </span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    {latestEval.timeComplexity}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Space Complexity: </span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    {latestEval.spaceComplexity}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {latestEval.aiFeedback}
              </p>

              {latestEval.edgeCasesMissed.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Edge Cases to Address
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-700 dark:text-slate-300">
                    {latestEval.edgeCasesMissed.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Recommended Improvement</p>
                <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">
                  {latestEval.improvedApproach}
                </p>
              </div>
            </div>
          )}

          {problemHistory.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Submission History ({problemHistory.length})
              </h4>
              <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
                {problemHistory.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between py-2.5 text-xs">
                    <span className="text-slate-700 dark:text-slate-300">
                      {sub.status === 'passed' ? 'Passed' : 'Needs improvement'} · {sub.timeComplexity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLatestEval(sub)}
                      className="font-mono font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {sub.score}/100 · View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
