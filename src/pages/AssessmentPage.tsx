import React, { useState } from 'react';
import { CheckCircle2, Info, Play } from 'lucide-react';
import { useCareerData } from '../hooks/useCareerData.ts';
import { callAiApi } from '../lib/apiClient.ts';
import {
  completeAssessmentRecord,
  createAssessmentRecord,
  logStudyActivity,
  upsertUserSkill,
} from '../lib/firestoreRepo.ts';
import { getTodayIsoDate } from '../lib/readiness.ts';
import { Assessment, AssessmentQuestion } from '../types/career.ts';
import { ErrorBanner, LoadingRows } from '../components/DataState.tsx';

export function AssessmentPage() {
  const { uid, profile, skills, assessments, isLoading, invalidate } = useCareerData();

  const [selectedAreas, setSelectedAreas] = useState<string[]>([
    'Core Java',
    'Spring Boot',
    'SQL Queries & Joins',
    'Data Structures & Algorithms',
  ]);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingRows rows={6} />;
  }

  const toggleArea = (name: string) => {
    setSelectedAreas((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name].slice(0, 8)
    );
  };

  const handleStartAssessment = async () => {
    if (!uid || !profile) return;
    if (selectedAreas.length === 0) {
      setErrorMsg('Select at least one skill area to assess.');
      return;
    }

    setGenerating(true);
    setErrorMsg(null);
    try {
      const { data, tokensUsed } = await callAiApi<{
        title: string;
        questions: {
          id: string;
          skillArea: string;
          type: 'mcq' | 'descriptive';
          difficulty: 'Easy' | 'Medium' | 'Hard';
          prompt: string;
          options: string[];
          correctOptionIndex: number;
        }[];
      }>('/api/ai/assessment/generate', {
        targetRole: profile.targetRole,
        targetSalaryLpa: profile.targetSalaryLpa,
        yearsOfExperience: profile.yearsOfExperience,
        focusAreas: selectedAreas,
      });

      const formattedQuestions: AssessmentQuestion[] = data.questions.map((q) => ({
        id: q.id,
        skillArea: q.skillArea,
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options: q.options || [],
        correctOptionIndex: q.correctOptionIndex,
        userAnswer: '',
        score: 0,
        maxScore: 100,
        explanation: '',
        evaluationBasis: '',
      }));

      const newId = await createAssessmentRecord(uid, {
        title: data.title,
        focusAreas: selectedAreas,
        status: 'in_progress',
        overallScore: 0,
        scoreBasis: 'Pending evaluation',
        strongAreas: [],
        weakAreas: [],
        summaryFeedback: '',
        questions: formattedQuestions,
      });

      await logStudyActivity(uid, {
        date: getTodayIsoDate(),
        minutesStudied: 0,
        tasksCompleted: 0,
        aiTokensUsed: tokensUsed,
        actionType: 'assessment_generated',
        note: `Generated assessment: ${data.title}`,
      });

      setAnswers({});
      setActiveAssessment({
        id: newId,
        uid,
        title: data.title,
        focusAreas: selectedAreas,
        status: 'in_progress',
        overallScore: 0,
        scoreBasis: 'Pending evaluation',
        strongAreas: [],
        weakAreas: [],
        summaryFeedback: '',
        questions: formattedQuestions,
      });
      invalidate('assessments');
      invalidate('activityLogs');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate assessment.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !profile || !activeAssessment) return;

    setEvaluating(true);
    setErrorMsg(null);
    try {
      const payloadQuestions = activeAssessment.questions.map((q) => ({
        id: q.id,
        skillArea: q.skillArea,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        userAnswer: answers[q.id] || 'No answer provided',
      }));

      const { data, tokensUsed } = await callAiApi<{
        overallScore: number;
        scoreBasis: string;
        strongAreas: string[];
        weakAreas: string[];
        summaryFeedback: string;
        evaluatedQuestions: {
          id: string;
          score: number;
          explanation: string;
          evaluationBasis: string;
        }[];
        skillUpdates: {
          skillArea: string;
          estimatedScore: number;
          basis: string;
        }[];
      }>('/api/ai/assessment/evaluate', {
        targetRole: profile.targetRole,
        questions: payloadQuestions,
      });

      const mergedQuestions: AssessmentQuestion[] = activeAssessment.questions.map((q) => {
        const evalMatch = data.evaluatedQuestions.find((ev) => ev.id === q.id);
        return {
          ...q,
          userAnswer: answers[q.id] || '',
          score: evalMatch?.score ?? 0,
          explanation: evalMatch?.explanation ?? '',
          evaluationBasis: evalMatch?.evaluationBasis ?? '',
        };
      });

      await completeAssessmentRecord(uid, activeAssessment.id, {
        status: 'completed',
        overallScore: Math.round(data.overallScore),
        scoreBasis: data.scoreBasis,
        strongAreas: data.strongAreas,
        weakAreas: data.weakAreas,
        summaryFeedback: data.summaryFeedback,
        questions: mergedQuestions,
      });

      // Update matching skills in Firestore with transparent basis
      for (const upd of data.skillUpdates) {
        const existingSkill = skills.find(
          (s) =>
            s.name.toLowerCase().includes(upd.skillArea.toLowerCase()) ||
            upd.skillArea.toLowerCase().includes(s.name.toLowerCase())
        );
        const skillId = existingSkill
          ? existingSkill.id
          : upd.skillArea.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await upsertUserSkill(uid, {
          id: skillId,
          name: existingSkill?.name || upd.skillArea,
          category: existingSkill?.category || 'Core Java',
          score: Math.round(upd.estimatedScore),
          targetScore: existingSkill?.targetScore || 80,
          basis: upd.basis.slice(0, 380),
          source: 'assessment',
        });
      }

      await logStudyActivity(uid, {
        date: getTodayIsoDate(),
        minutesStudied: 20,
        tasksCompleted: 1,
        aiTokensUsed: tokensUsed,
        actionType: 'assessment_completed',
        note: `Completed assessment (${Math.round(data.overallScore)}/100)`,
      });

      setActiveAssessment({
        ...activeAssessment,
        status: 'completed',
        overallScore: Math.round(data.overallScore),
        scoreBasis: data.scoreBasis,
        strongAreas: data.strongAreas,
        weakAreas: data.weakAreas,
        summaryFeedback: data.summaryFeedback,
        questions: mergedQuestions,
      });

      invalidate('assessments');
      invalidate('skills');
      invalidate('activityLogs');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to evaluate assessment.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            AI Skill Assessment
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Evaluate your Core Java, Spring Boot, SQL, System Design, and DSA proficiency with transparent rubric explanations.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <span>
          Assessment scores are AI-assisted diagnostic estimates derived strictly from your submitted answers in this session—not a scientifically standardized psychometric exam. Every score displays its exact basis.
        </span>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {/* Configure New Assessment */}
      {!activeAssessment && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Select Skill Areas to Assess (up to 8)
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => {
              const selected = selectedAreas.includes(skill.name);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleArea(skill.name)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {skill.name} ({skill.score})
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              6 questions (4 MCQ + 2 descriptive) tailored for {profile?.targetRole || 'Java Backend Developer'}
            </span>
            <button
              type="button"
              onClick={handleStartAssessment}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              <span>{generating ? 'Generating questions...' : 'Start Assessment'}</span>
            </button>
          </div>
        </section>
      )}

      {/* Active Assessment Runner / Results */}
      {activeAssessment && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                {activeAssessment.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeAssessment.focusAreas.join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveAssessment(null)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          {activeAssessment.status === 'completed' ? (
            <div className="mt-5 space-y-6">
              <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Session Score</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {activeAssessment.overallScore}/100
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Strong Areas</p>
                  <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {activeAssessment.strongAreas.join(', ') || 'None yet'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Needs Focus</p>
                  <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-400">
                    {activeAssessment.weakAreas.join(', ') || 'None identified'}
                  </p>
                </div>
              </div>

              <div className="text-sm text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Score Basis</p>
                <p className="mt-1">{activeAssessment.scoreBasis}</p>
                <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">Summary Feedback</p>
                <p className="mt-1">{activeAssessment.summaryFeedback}</p>
              </div>

              <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {activeAssessment.questions.map((q, idx) => (
                  <div key={q.id} className="py-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Q{idx + 1} · {q.skillArea} · {q.difficulty}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {q.score}/100
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{q.prompt}</p>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                      Your answer: {q.userAnswer || '—'}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300">{q.explanation}</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Basis: {q.evaluationBasis}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitAssessment} className="mt-5 space-y-6">
              {activeAssessment.questions.map((q, idx) => (
                <div key={q.id} className="border-b border-slate-200 pb-5 last:border-b-0 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Question {idx + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.skillArea}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.difficulty}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">{q.prompt}</p>

                  {q.type === 'mcq' && q.options.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const checked = answers[q.id] === opt;
                        return (
                          <label
                            key={optIdx}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                              checked
                                ? 'border-blue-600 bg-blue-50 text-slate-900 dark:border-blue-500 dark:bg-blue-950/50 dark:text-slate-100'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={checked}
                              onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                              className="h-4 w-4 text-blue-600"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Write a clear, concise technical explanation..."
                      className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={evaluating}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{evaluating ? 'Evaluating answers...' : 'Submit & Evaluate'}</span>
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Assessment History */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Assessment History
        </h3>
        {assessments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No assessments taken yet. Start one above to calibrate your Java Backend skill scores.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {assessments.map((asm) => (
              <div key={asm.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{asm.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {asm.focusAreas.join(' · ')} · Status: {asm.status === 'completed' ? 'Completed' : 'In Progress'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {asm.status === 'completed' ? `${asm.overallScore}/100` : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveAssessment(asm)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {asm.status === 'completed' ? 'View Report' : 'Resume'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
