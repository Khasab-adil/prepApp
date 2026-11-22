import React, { useState } from 'react';
import { CheckCircle2, Clock, Plus, Send } from 'lucide-react';
import { useCareerData } from '../hooks/useCareerData.ts';
import { callAiApi } from '../lib/apiClient.ts';
import { createDailyTask, logStudyActivity, updateDailyTask } from '../lib/firestoreRepo.ts';
import { getTodayIsoDate } from '../lib/readiness.ts';
import { DailyTask } from '../types/career.ts';
import { ErrorBanner, LoadingRows } from '../components/DataState.tsx';

export function DailyPlannerPage() {
  const { uid, profile, activeRoadmap, dailyTasks, isLoading, invalidate } = useCareerData();

  const [filter, setFilter] = useState<'today' | 'all' | 'completed'>('today');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [adaptiveNote, setAdaptiveNote] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingRows rows={6} />;
  }

  const today = getTodayIsoDate();
  const visibleTasks = dailyTasks.filter((t) => {
    if (filter === 'today') return t.date === today || t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const todaysMinutes = dailyTasks
    .filter((t) => t.date === today)
    .reduce((sum, t) => sum + t.durationMinutes, 0);

  const handleStartTask = async (task: DailyTask) => {
    if (!uid) return;
    setExpandedId(task.id);
    if (task.status === 'pending') {
      try {
        await updateDailyTask(uid, task.id, { status: 'in_progress' });
        invalidate('dailyTasks');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to update task.');
      }
    }
  };

  const handleEvaluateAnswer = async (task: DailyTask) => {
    if (!uid || !profile) return;
    const answer = (draftAnswers[task.id] ?? task.userAnswer).trim();
    if (!answer) {
      setErrorMsg('Write your answer to the practice prompt before submitting.');
      return;
    }

    setSubmittingId(task.id);
    setErrorMsg(null);
    setAdaptiveNote(null);

    try {
      const { data, tokensUsed } = await callAiApi<{
        score: number;
        passed: boolean;
        feedback: string;
        keyTakeaway: string;
        adaptiveRecommendation: string;
      }>('/api/ai/planner/evaluate', {
        topicTitle: task.topicTitle,
        category: task.category,
        practiceQuestion: task.practiceQuestion,
        userAnswer: answer,
        targetRole: profile.targetRole,
      });

      const completed = data.passed;
      await updateDailyTask(uid, task.id, {
        userAnswer: answer,
        aiFeedback: `${data.feedback}\n\nKey takeaway: ${data.keyTakeaway}`,
        score: Math.round(data.score),
        status: completed ? 'completed' : 'in_progress',
        completedDate: completed ? today : '',
      });

      await logStudyActivity(uid, {
        date: today,
        minutesStudied: completed ? task.durationMinutes : Math.round(task.durationMinutes / 2),
        tasksCompleted: completed ? 1 : 0,
        aiTokensUsed: tokensUsed,
        actionType: completed ? 'daily_task_completed' : 'daily_task_attempted',
        note: `${task.topicTitle} (${Math.round(data.score)}/100)`,
      });

      setAdaptiveNote(`Adaptive recommendation: ${data.adaptiveRecommendation}`);
      invalidate('dailyTasks');
      invalidate('activityLogs');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not evaluate your answer.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleMarkCompletedDirectly = async (task: DailyTask) => {
    if (!uid) return;
    try {
      await updateDailyTask(uid, task.id, {
        status: 'completed',
        completedDate: today,
      });
      await logStudyActivity(uid, {
        date: today,
        minutesStudied: task.durationMinutes,
        tasksCompleted: 1,
        aiTokensUsed: 0,
        actionType: 'daily_task_completed',
        note: `Completed: ${task.topicTitle}`,
      });
      invalidate('dailyTasks');
      invalidate('activityLogs');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to mark task complete.');
    }
  };

  const handlePullNextFromRoadmap = async () => {
    if (!uid) return;
    if (!activeRoadmap) {
      setErrorMsg('Generate a roadmap first to pull adaptive tasks from it.');
      return;
    }

    const nextTopic = activeRoadmap.phases
      .flatMap((p) => p.topics.map((t) => ({ topic: t, phaseTitle: p.title })))
      .find((entry) => entry.topic.status !== 'completed');

    if (!nextTopic) {
      setErrorMsg('All topics in your active roadmap are marked completed.');
      return;
    }

    try {
      await createDailyTask(uid, {
        date: today,
        roadmapId: activeRoadmap.id,
        topicTitle: nextTopic.topic.title,
        category: nextTopic.phaseTitle,
        durationMinutes: Math.min(90, nextTopic.topic.durationMinutes),
        learningContent: `${nextTopic.topic.objective}\n\n${nextTopic.topic.studyMaterial}`,
        practiceQuestion: nextTopic.topic.practicalExercise,
        userAnswer: '',
        aiFeedback: '',
        score: 0,
        status: 'pending',
        completedDate: '',
        isSeeded: false,
      });
      invalidate('dailyTasks');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add task.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Daily Study Planner
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Target daily budget:{' '}
            <span className="font-mono tabular-nums">{(profile?.dailyStudyHours ?? 2) * 60} mins</span> · Scheduled today:{' '}
            <span className="font-mono tabular-nums">{todaysMinutes} mins</span>. Completed history is never overwritten.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePullNextFromRoadmap}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>Pull Next Roadmap Topic</span>
        </button>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}
      {adaptiveNote && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          {adaptiveNote}
        </div>
      )}

      {/* Segmented Filter */}
      <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {(['today', 'completed', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === tab
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {tab === 'today' ? "Today's & Active" : tab === 'completed' ? 'Completed History' : 'All Tasks'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visibleTasks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            No tasks in this view. Pull a topic from your roadmap or switch filter tabs.
          </div>
        ) : (
          visibleTasks.map((task) => {
            const isOpen = expandedId === task.id;
            const currentDraft = draftAnswers[task.id] ?? task.userAnswer;
            return (
              <article
                key={task.id}
                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{task.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{task.durationMinutes} min</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{task.date}</span>
                      {task.isSeeded && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Seeded Starter</span>
                        </>
                      )}
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                      {task.topicTitle}
                    </h3>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {task.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed {task.score > 0 ? `(${task.score}/100)` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5" />
                        {task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => (isOpen ? setExpandedId(null) : handleStartTask(task))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {isOpen ? 'Collapse' : task.status === 'completed' ? 'Review' : 'Start Task'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-5 space-y-5 border-t border-slate-200 pt-5 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Learning Content
                      </p>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {task.learningContent}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Practice Prompt
                      </p>
                      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{task.practiceQuestion}</p>

                      <textarea
                        rows={3}
                        value={currentDraft}
                        onChange={(e) =>
                          setDraftAnswers((prev) => ({ ...prev, [task.id]: e.target.value }))
                        }
                        disabled={task.status === 'completed'}
                        placeholder="Write your concise technical answer here..."
                        className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none disabled:opacity-75 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />

                      {task.status !== 'completed' && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-500 dark:text-slate-400">
                              Duration (min):
                            </label>
                            <input
                              type="number"
                              min={5}
                              max={240}
                              defaultValue={task.durationMinutes}
                              onBlur={async (e) => {
                                if (!uid) return;
                                const nextMin = Math.max(5, Math.min(240, Number(e.target.value) || 30));
                                if (nextMin !== task.durationMinutes) {
                                  await updateDailyTask(uid, task.id, { durationMinutes: nextMin });
                                  invalidate('dailyTasks');
                                }
                              }}
                              className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs tabular-nums dark:border-slate-700 dark:bg-slate-900"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleMarkCompletedDirectly(task)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Mark Completed
                            </button>
                            <button
                              type="button"
                              disabled={submittingId === task.id}
                              onClick={() => handleEvaluateAnswer(task)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>
                                {submittingId === task.id ? 'Evaluating...' : 'Submit Answer for AI Feedback'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {task.aiFeedback && (
                      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
                          <span>AI Coach Feedback</span>
                          <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400">
                            Score: {task.score}/100
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-line text-slate-700 dark:text-slate-300">
                          {task.aiFeedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
