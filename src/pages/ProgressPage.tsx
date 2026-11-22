import React from 'react';
import { useCareerData } from '../hooks/useCareerData.ts';
import { LoadingRows } from '../components/DataState.tsx';

export function ProgressPage() {
  const {
    skills,
    assessments,
    dailyTasks,
    mockInterviews,
    codingSubmissions,
    projects,
    readiness,
    streakStats,
    isLoading,
  } = useCareerData();

  if (isLoading) {
    return <LoadingRows rows={6} />;
  }

  const masteredSkills = skills.filter((s) => s.score >= s.targetScore);
  const gapSkills = skills.filter((s) => s.score < s.targetScore).sort((a, b) => a.score - b.score);
  const completedTasksCount = dailyTasks.filter((t) => t.status === 'completed').length;
  const pendingTasksCount = dailyTasks.filter((t) => t.status !== 'completed').length;
  const passedCodingCount = new Set(
    codingSubmissions.filter((s) => s.status === 'passed').map((s) => s.problemId)
  ).size;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Career Progress &amp; Job Readiness
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Calculated deterministically from persisted skill scores, assessments, roadmap completion, mock interviews, and project execution.
        </p>
      </div>

      {/* Transparent Job Readiness Formula */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Deterministic Readiness Index
            </p>
            <h3 className="mt-1 font-display text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {readiness.totalPercent}% · {readiness.tierLabel}
            </h3>
          </div>
          <div className="text-right text-xs text-slate-500 dark:text-slate-400">
            <p>Streak: {streakStats.currentStreak} days (best {streakStats.longestStreak}d)</p>
            <p className="mt-0.5 font-mono tabular-nums">{streakStats.totalMinutes} mins studied</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Criterion</th>
                <th className="py-2 px-4 text-right font-medium">Weight</th>
                <th className="py-2 px-4 text-right font-medium">Current</th>
                <th className="py-2 px-4 text-right font-medium">Points</th>
                <th className="py-2 pl-4 font-medium">Evidence Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {readiness.criteria.map((c) => (
                <tr key={c.label}>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">{c.label}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {c.weightPercent}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {c.scorePercent}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                    +{c.weightedPoints}
                  </td>
                  <td className="py-3 pl-4 text-xs text-slate-600 dark:text-slate-400">{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Summary Counts */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Skills at Goal</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {masteredSkills.length} / {skills.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Tasks Completed / Pending</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {completedTasksCount} / {pendingTasksCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Assessments &amp; Interviews</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {assessments.filter((a) => a.status === 'completed').length} /{' '}
            {mockInterviews.filter((i) => i.status === 'completed').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Coding Solved &amp; Projects</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {passedCodingCount} / {projects.length}
          </p>
        </div>
      </section>

      {/* Full Skill Matrix */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Full Java Backend Skill Matrix ({gapSkills.length} needing improvement · {masteredSkills.length} mastered)
        </h3>
        <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {[...gapSkills, ...masteredSkills].map((s) => {
            const pct = Math.min(100, Math.round((s.score / s.targetScore) * 100));
            const atGoal = s.score >= s.targetScore;
            return (
              <div key={s.id} className="grid items-center gap-3 py-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s.category} · {s.source === 'seed' ? 'Seeded baseline' : 'Evaluated'}
                  </p>
                </div>
                <div className="sm:col-span-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${atGoal ? 'bg-emerald-600' : 'bg-blue-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="sm:col-span-4 sm:text-right">
                  <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {s.score} / {s.targetScore}
                  </span>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{s.basis}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
