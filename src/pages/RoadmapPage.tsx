import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarPlus, CheckCircle2, Circle, Clock, Sparkles } from 'lucide-react';
import { useCareerData } from '../hooks/useCareerData.ts';
import { callAiApi } from '../lib/apiClient.ts';
import {
  createDailyTask,
  createRoadmapRecord,
  logStudyActivity,
  setActiveRoadmap,
  updateRoadmapPhases,
} from '../lib/firestoreRepo.ts';
import { getTodayIsoDate } from '../lib/readiness.ts';
import { RoadmapHorizon, RoadmapPhase, RoadmapTopic } from '../types/career.ts';
import { EmptyState, ErrorBanner, LoadingRows } from '../components/DataState.tsx';

export function RoadmapPage() {
  const navigate = useNavigate();
  const { uid, profile, skills, roadmaps, activeRoadmap, jobAnalyses, isLoading, invalidate } = useCareerData();

  const [horizon, setHorizon] = useState<RoadmapHorizon>(30);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingRows rows={6} />;
  }

  const handleGenerateRoadmap = async () => {
    if (!uid || !profile) return;
    setGenerating(true);
    setErrorMsg(null);
    setNotice(null);

    try {
      const sorted = [...skills].sort((a, b) => a.score - b.score);
      const weakSkills = sorted.slice(0, 6).map((s) => ({ name: s.name, score: s.score }));
      const strongSkills = sorted.slice(-4).map((s) => ({ name: s.name, score: s.score }));
      const jdMissingSkills = Array.from(
        new Set(jobAnalyses.flatMap((j) => j.missingSkills))
      ).slice(0, 10);

      const { data, tokensUsed } = await callAiApi<{
        title: string;
        phases: {
          phaseNumber: number;
          title: string;
          rationale: string;
          topics: Omit<RoadmapTopic, 'status'>[];
        }[];
      }>('/api/ai/roadmap/generate', {
        horizonDays: horizon,
        targetRole: profile.targetRole,
        targetSalaryLpa: profile.targetSalaryLpa,
        yearsOfExperience: profile.yearsOfExperience,
        dailyStudyHours: profile.dailyStudyHours,
        weakSkills,
        strongSkills,
        jdMissingSkills,
      });

      const phasesWithStatus: RoadmapPhase[] = data.phases.map((p) => ({
        ...p,
        topics: p.topics.map((t) => ({ ...t, status: 'pending' as const })),
      }));

      await createRoadmapRecord(uid, {
        title: data.title,
        horizonDays: horizon,
        targetRole: profile.targetRole,
        targetSalaryLpa: profile.targetSalaryLpa,
        dailyHours: profile.dailyStudyHours,
        isActive: true,
        phases: phasesWithStatus,
      });

      await logStudyActivity(uid, {
        date: getTodayIsoDate(),
        minutesStudied: 0,
        tasksCompleted: 0,
        aiTokensUsed: tokensUsed,
        actionType: 'roadmap_generated',
        note: `Generated ${horizon}-day roadmap: ${data.title}`,
      });

      invalidate('roadmaps');
      invalidate('activityLogs');
      setNotice(`Generated and activated your ${horizon}-day roadmap.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate roadmap.');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTopicStatus = async (phaseIndex: number, topicId: string) => {
    if (!uid || !activeRoadmap) return;
    const nextPhases = activeRoadmap.phases.map((phase, idx) => {
      if (idx !== phaseIndex) return phase;
      return {
        ...phase,
        topics: phase.topics.map((topic) => {
          if (topic.topicId !== topicId) return topic;
          const nextStatus: RoadmapTopic['status'] =
            topic.status === 'pending'
              ? 'in_progress'
              : topic.status === 'in_progress'
                ? 'completed'
                : 'pending';
          return { ...topic, status: nextStatus };
        }),
      };
    });

    try {
      await updateRoadmapPhases(uid, activeRoadmap.id, nextPhases);
      invalidate('roadmaps');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not update topic status.');
    }
  };

  const handleScheduleTopicToday = async (topic: RoadmapTopic, phaseTitle: string) => {
    if (!uid || !activeRoadmap) return;
    try {
      await createDailyTask(uid, {
        date: getTodayIsoDate(),
        roadmapId: activeRoadmap.id,
        topicTitle: topic.title,
        category: phaseTitle,
        durationMinutes: Math.min(180, Math.max(15, topic.durationMinutes)),
        learningContent: `${topic.objective}\n\n${topic.studyMaterial}`,
        practiceQuestion: topic.practicalExercise,
        userAnswer: '',
        aiFeedback: '',
        score: 0,
        status: 'pending',
        completedDate: '',
        isSeeded: false,
      });
      invalidate('dailyTasks');
      setNotice(`Added "${topic.title}" to Today's Daily Planner.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to schedule topic.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Intelligent Study Roadmap
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Prerequisite-ordered phases tailored to {profile?.targetRole || 'Java Backend Developer'} (₹{profile?.targetSalaryLpa ?? 9} LPA) at {profile?.dailyStudyHours ?? 2} hrs/day.
          </p>
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}
      {notice && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {/* Horizon Generator Bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Select Roadmap Horizon</p>
            <div className="mt-2 inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {([7, 30, 60, 90] as RoadmapHorizon[]).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setHorizon(days)}
                  className={`rounded-md px-3.5 py-1.5 font-mono text-xs font-medium tabular-nums transition-colors ${
                    horizon === days
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateRoadmap}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            <span>{generating ? `Generating ${horizon}-day roadmap...` : `Generate ${horizon}-Day Roadmap`}</span>
          </button>
        </div>

        {roadmaps.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Saved roadmaps:</span>
            {roadmaps.map((rm) => (
              <button
                key={rm.id}
                type="button"
                onClick={async () => {
                  if (!uid) return;
                  await setActiveRoadmap(uid, rm.id, roadmaps);
                  invalidate('roadmaps');
                }}
                className={`rounded-md border px-2.5 py-1 font-medium ${
                  rm.isActive
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {rm.horizonDays}d · {rm.title}
              </button>
            ))}
          </div>
        )}
      </section>

      {!activeRoadmap ? (
        <EmptyState
          title="No study roadmap generated yet"
          description="Generate a personalized 7, 30, 60, or 90-day roadmap sequenced by prerequisites and aligned with your current skill gaps."
          actionLabel={`Generate ${horizon}-Day Roadmap`}
          onAction={handleGenerateRoadmap}
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              {activeRoadmap.title}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {activeRoadmap.horizonDays}-Day Plan · {activeRoadmap.targetRole} · ₹{activeRoadmap.targetSalaryLpa} LPA ·{' '}
              {activeRoadmap.dailyHours} hrs/day
            </p>
          </div>

          {activeRoadmap.phases.map((phase, pIdx) => (
            <section
              key={phase.phaseNumber}
              className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Phase {phase.phaseNumber}
                </p>
                <h4 className="mt-0.5 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {phase.title}
                </h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{phase.rationale}</p>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {phase.topics.map((topic) => (
                  <div key={topic.topicId} className="py-5 first:pt-4 last:pb-1">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{topic.difficulty}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{topic.durationMinutes} min</span>
                          {topic.prerequisites.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Prerequisites: {topic.prerequisites.join(', ')}</span>
                            </>
                          )}
                        </div>
                        <h5 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {topic.title}
                        </h5>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{topic.objective}</p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleTopicStatus(pIdx, topic.topicId)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            topic.status === 'completed'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : topic.status === 'in_progress'
                                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          {topic.status === 'completed' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : topic.status === 'in_progress' ? (
                            <Clock className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {topic.status === 'completed'
                              ? 'Completed'
                              : topic.status === 'in_progress'
                                ? 'In Progress'
                                : 'Mark Started'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleScheduleTopicToday(topic, phase.title)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          <span>Add to Today</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            navigate('/tutor', {
                              state: { topic: topic.title, phase: phase.title },
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Learn with Tutor</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-2 dark:text-slate-400">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">Study Material</p>
                        <p className="mt-1 leading-relaxed">{topic.studyMaterial}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">Practical Exercise</p>
                        <p className="mt-1 leading-relaxed">{topic.practicalExercise}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">Expected Outcome</p>
                        <p className="mt-1 leading-relaxed">{topic.expectedOutcome}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">Completion Criteria</p>
                        <p className="mt-1 leading-relaxed">{topic.completionCriteria}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
