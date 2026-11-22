import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { useCareerData } from '../hooks/useCareerData.ts';
import { LoadingRows } from '../components/DataState.tsx';
import { getTodayIsoDate } from '../lib/readiness.ts';

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    profile,
    skills,
    assessments,
    activeRoadmap,
    dailyTasks,
    mockInterviews,
    readiness,
    streakStats,
    isLoading,
  } = useCareerData();

  if (isLoading) {
    return <LoadingRows rows={6} />;
  }

  const today = getTodayIsoDate();
  const todaysTasks = dailyTasks.filter((t) => t.date === today);
  const displayTasks = todaysTasks.length > 0 ? todaysTasks : dailyTasks.slice(0, 4);
  const completedTodayCount = displayTasks.filter((t) => t.status === 'completed').length;

  const weakestSkills = [...skills]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const allRoadmapTopics = activeRoadmap ? activeRoadmap.phases.flatMap((p) => p.topics) : [];
  const completedRoadmapTopics = allRoadmapTopics.filter((t) => t.status === 'completed').length;
  const roadmapProgressPct =
    allRoadmapTopics.length > 0 ? Math.round((completedRoadmapTopics / allRoadmapTopics.length) * 100) : 0;

  const completedAssessments = assessments.filter((a) => a.status === 'completed');
  const completedInterviews = mockInterviews.filter((i) => i.status === 'completed');

  // Deterministic recommended next action
  let nextAction = {
    title: 'Complete your career profile',
    reason: 'Confirm your target role, ₹ LPA goal, and daily study hours so roadmaps fit your schedule.',
    cta: 'Update Profile',
    to: '/profile',
  };
  if (profile?.onboardingCompleted && completedAssessments.length === 0) {
    nextAction = {
      title: 'Run your baseline Skill Assessment',
      reason: 'Replace seeded skill baselines with evaluated scores across Core Java, Spring Boot, SQL, and DSA.',
      cta: 'Start Assessment',
      to: '/assessment',
    };
  } else if (!activeRoadmap) {
    nextAction = {
      title: 'Generate your prerequisite-ordered Study Roadmap',
      reason: 'Create a 7, 30, 60, or 90-day roadmap targeted to your weakest skills and ₹9 LPA goal.',
      cta: 'Build Roadmap',
      to: '/roadmap',
    };
  } else if (displayTasks.some((t) => t.status !== 'completed')) {
    nextAction = {
      title: "Finish today's study mission",
      reason: `${displayTasks.length - completedTodayCount} task(s) remain in your ${profile?.dailyStudyHours ?? 2}-hour daily plan.`,
      cta: 'Open Daily Planner',
      to: '/planner',
    };
  } else if (completedInterviews.length === 0) {
    nextAction = {
      title: 'Take a Java & Spring Boot Mock Interview',
      reason: 'Validate your technical clarity and identify missing concepts under interview questions.',
      cta: 'Start Mock Interview',
      to: '/interviews',
    };
  }

  return (
    <div className="space-y-8">
      {/* Hero Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {profile?.targetLocation || 'Bengaluru, India'} · Timeline: {profile?.jobSearchTimeline || '90 days'}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back, {profile?.fullName || 'Developer'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              Target: <span className="font-semibold text-slate-900 dark:text-slate-100">{profile?.targetRole || 'Java Backend Developer'}</span> · Package goal{' '}
              <span className="font-mono font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                ₹{profile?.targetSalaryLpa ?? 9} LPA
              </span>{' '}
              · Daily budget{' '}
              <span className="font-mono tabular-nums">{profile?.dailyStudyHours ?? 2} hrs/day</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(nextAction.to)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
            >
              <span>{nextAction.cta}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Recommended Next Action Strip */}
        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Recommended next step</p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{nextAction.title}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{nextAction.reason}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/progress')}
            className="text-xs font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100 whitespace-nowrap self-start sm:self-center"
          >
            View readiness breakdown
          </button>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Job Readiness</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {readiness.totalPercent}%
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{readiness.tierLabel}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Learning Streak</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {streakStats.currentStreak} days
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Longest: {streakStats.longestStreak}d · {streakStats.totalMinutes} mins logged
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Roadmap Progress</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {roadmapProgressPct}%
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {activeRoadmap ? `${completedRoadmapTopics}/${allRoadmapTopics.length} topics done` : 'No active roadmap yet'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Today&apos;s Mission</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {completedTodayCount}/{displayTasks.length}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Tasks completed today
          </p>
        </div>
      </section>

      {/* Main Split: Today's Study Plan + Weakest Skills */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Today&apos;s Study Plan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scheduled tasks · Click any task in Daily Planner to submit practice answers
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/planner')}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
            >
              Open Planner
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {displayTasks.length === 0 ? (
              <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
                No tasks scheduled yet. Open Daily Planner to generate today&apos;s mission.
              </p>
            ) : (
              displayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{task.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{task.durationMinutes} min</span>
                      {task.isSeeded && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Starter curriculum</span>
                        </>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {task.topicTitle}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {task.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Done
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Priority Skill Gaps
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lowest current scores vs target ₹{profile?.targetSalaryLpa ?? 9} LPA benchmark
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/assessment')}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
            >
              Assess now
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {weakestSkills.map((skill) => {
              const pct = Math.min(100, Math.round((skill.score / skill.targetScore) * 100));
              return (
                <div key={skill.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{skill.name}</span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {skill.score} / {skill.targetScore}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {skill.basis}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recent Performance Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Recent Evaluations &amp; Milestones
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">Latest Assessment</p>
            {completedAssessments[0] ? (
              <>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {completedAssessments[0].title}
                </p>
                <p className="mt-0.5 font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
                  Score: {completedAssessments[0].overallScore}/100
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">No assessment completed yet</p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">Latest Mock Interview</p>
            {completedInterviews[0] ? (
              <>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {completedInterviews[0].track} ({completedInterviews[0].difficulty})
                </p>
                <p className="mt-0.5 font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
                  Score: {completedInterviews[0].overallScore}/100
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">No mock interview completed yet</p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">Active Roadmap Horizon</p>
            {activeRoadmap ? (
              <>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {activeRoadmap.title}
                </p>
                <p className="mt-0.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                  {activeRoadmap.horizonDays} days · {activeRoadmap.phases.length} phases
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Generate a roadmap to begin</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
