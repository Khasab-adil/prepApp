import React, { useState } from 'react';
import { CheckSquare, Sparkles, Square } from 'lucide-react';
import { useCareerData } from '../hooks/useCareerData.ts';
import { callAiApi } from '../lib/apiClient.ts';
import {
  createPortfolioProject,
  logStudyActivity,
  updatePortfolioProjectChecklists,
} from '../lib/firestoreRepo.ts';
import { getTodayIsoDate } from '../lib/readiness.ts';
import { PortfolioProject } from '../types/career.ts';
import { ErrorBanner, LoadingRows } from '../components/DataState.tsx';

export function ProjectsPage() {
  const { uid, profile, projects, isLoading, invalidate } = useCareerData();

  const [focusSkill, setFocusSkill] = useState('Spring Boot Microservices, Redis & PostgreSQL');
  const [difficulty, setDifficulty] = useState('Intermediate (₹9 LPA Portfolio Standard)');
  const [generating, setGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingRows rows={6} />;
  }

  const activeProject: PortfolioProject | null =
    projects.find((p) => p.id === selectedId) || projects[0] || null;

  const handleRecommendProject = async () => {
    if (!uid || !profile) return;
    setGenerating(true);
    setErrorMsg(null);
    try {
      const { data, tokensUsed } = await callAiApi<{
        title: string;
        difficulty: string;
        summary: string;
        techStack: string[];
        architectureNotes: string;
        databaseDesign: string;
        apiSpecs: string[];
        milestones: { id: string; title: string; description: string }[];
        testingChecklist: string[];
        deploymentChecklist: string[];
        resumeBullets: string[];
      }>('/api/ai/projects/recommend', {
        targetRole: profile.targetRole,
        targetSalaryLpa: profile.targetSalaryLpa,
        focusSkill: focusSkill.trim(),
        difficulty,
      });

      const newId = await createPortfolioProject(uid, {
        title: data.title,
        difficulty: data.difficulty,
        targetRole: profile.targetRole,
        summary: data.summary,
        techStack: data.techStack,
        architectureNotes: data.architectureNotes,
        databaseDesign: data.databaseDesign,
        apiSpecs: data.apiSpecs,
        milestones: data.milestones.map((m) => ({ ...m, completed: false })),
        testingChecklist: data.testingChecklist.map((item, idx) => ({
          id: `t_${idx + 1}`,
          item,
          done: false,
        })),
        deploymentChecklist: data.deploymentChecklist.map((item, idx) => ({
          id: `d_${idx + 1}`,
          item,
          done: false,
        })),
        resumeBullets: data.resumeBullets,
        isSeeded: false,
      });

      await logStudyActivity(uid, {
        date: getTodayIsoDate(),
        minutesStudied: 0,
        tasksCompleted: 0,
        aiTokensUsed: tokensUsed,
        actionType: 'project_generated',
        note: `Generated portfolio blueprint: ${data.title}`,
      });

      setSelectedId(newId);
      invalidate('projects');
      invalidate('activityLogs');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate project recommendation.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleMilestone = async (project: PortfolioProject, milestoneId: string) => {
    if (!uid) return;
    const nextMilestones = project.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    await updatePortfolioProjectChecklists(uid, project.id, {
      milestones: nextMilestones,
      testingChecklist: project.testingChecklist,
      deploymentChecklist: project.deploymentChecklist,
    });
    invalidate('projects');
  };

  const toggleCheckItem = async (
    project: PortfolioProject,
    field: 'testingChecklist' | 'deploymentChecklist',
    itemId: string
  ) => {
    if (!uid) return;
    const nextList = project[field].map((c) => (c.id === itemId ? { ...c, done: !c.done } : c));
    await updatePortfolioProjectChecklists(uid, project.id, {
      milestones: project.milestones,
      testingChecklist: field === 'testingChecklist' ? nextList : project.testingChecklist,
      deploymentChecklist: field === 'deploymentChecklist' ? nextList : project.deploymentChecklist,
    });
    invalidate('projects');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Portfolio Project Builder
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Build production-grade Java backend portfolio projects with schema design, API specs, milestones, and resume bullets.
        </p>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {/* Generate Custom Project */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Stack / Domain Focus
            </label>
            <input
              type="text"
              value={focusSkill}
              onChange={(e) => setFocusSkill(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Difficulty Level
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="Beginner (Core Java + SQL)">Beginner (Core Java + SQL)</option>
              <option value="Intermediate (₹9 LPA Portfolio Standard)">Intermediate (₹9 LPA Portfolio Standard)</option>
              <option value="Advanced (Distributed Microservices)">Advanced (Distributed Microservices)</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <button
              type="button"
              onClick={handleRecommendProject}
              disabled={generating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              <span>{generating ? 'Designing...' : 'New Project Blueprint'}</span>
            </button>
          </div>
        </div>

        {projects.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Your projects:</span>
            {projects.map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => setSelectedId(proj.id)}
                className={`rounded-md border px-2.5 py-1 font-medium ${
                  activeProject?.id === proj.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {proj.title}
              </button>
            ))}
          </div>
        )}
      </section>

      {activeProject && (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {activeProject.difficulty} · {activeProject.targetRole}
              </span>
              <span>{activeProject.isSeeded ? 'Starter Blueprint' : 'AI-Recommended Project'}</span>
            </div>
            <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              {activeProject.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {activeProject.summary}
            </p>
            <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-400">
              Stack: {activeProject.techStack.join(' · ')}
            </p>

            <div className="mt-6 grid gap-6 border-t border-slate-200 pt-5 md:grid-cols-2 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Architecture Guidance
                </h4>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {activeProject.architectureNotes}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Database Design
                </h4>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {activeProject.databaseDesign}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                API Specifications
              </h4>
              <ul className="mt-2 space-y-1.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                {activeProject.apiSpecs.map((api, idx) => (
                  <li key={idx}>{api}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Development Milestones
            </h4>
            <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
              {activeProject.milestones.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMilestone(activeProject, m.id)}
                  className="flex w-full items-start gap-3 py-3 text-left"
                >
                  {m.completed ? (
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        m.completed
                          ? 'text-slate-500 line-through dark:text-slate-500'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {m.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{m.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-6 border-t border-slate-200 pt-5 md:grid-cols-2 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Testing Checklist
                </h4>
                <div className="mt-2 space-y-2">
                  {activeProject.testingChecklist.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCheckItem(activeProject, 'testingChecklist', c.id)}
                      className="flex w-full items-start gap-2.5 text-left text-xs text-slate-700 dark:text-slate-300"
                    >
                      {c.done ? (
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <span className={c.done ? 'line-through opacity-60' : ''}>{c.item}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Deployment Checklist
                </h4>
                <div className="mt-2 space-y-2">
                  {activeProject.deploymentChecklist.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCheckItem(activeProject, 'deploymentChecklist', c.id)}
                      className="flex w-full items-start gap-2.5 text-left text-xs text-slate-700 dark:text-slate-300"
                    >
                      {c.done ? (
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <span className={c.done ? 'line-through opacity-60' : ''}>{c.item}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Resume-Ready Impact Bullets
              </h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
                {activeProject.resumeBullets.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
