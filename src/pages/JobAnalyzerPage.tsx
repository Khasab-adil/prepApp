import React, { useState } from 'react';
import { Briefcase, Trash2 } from 'lucide-react';
import { SAMPLE_JOB_DESCRIPTIONS } from '../data/seedCurriculum.ts';
import { useCareerData } from '../hooks/useCareerData.ts';
import { callAiApi } from '../lib/apiClient.ts';
import { createJobAnalysis, deleteJobAnalysis, logStudyActivity } from '../lib/firestoreRepo.ts';
import { getTodayIsoDate } from '../lib/readiness.ts';
import { JobAnalysis } from '../types/career.ts';
import { ErrorBanner, LoadingRows } from '../components/DataState.tsx';

export function JobAnalyzerPage() {
  const { uid, profile, skills, jobAnalyses, isLoading, invalidate } = useCareerData();

  const [company, setCompany] = useState('');
  const [rawDescription, setRawDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<JobAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingRows rows={6} />;
  }

  const activeReport = selectedReport || jobAnalyses[0] || null;

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !profile) return;
    if (rawDescription.trim().length < 30) {
      setErrorMsg('Paste a complete job description (at least 30 characters).');
      return;
    }

    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const { data, tokensUsed } = await callAiApi<
        Omit<JobAnalysis, 'id' | 'uid' | 'rawDescription' | 'createdAt' | 'updatedAt'>
      >('/api/ai/job/analyze', {
        company: company.trim(),
        rawDescription: rawDescription.trim(),
        userSkills: skills.map((s) => ({ name: s.name, score: s.score })),
        yearsOfExperience: profile.yearsOfExperience,
        targetSalaryLpa: profile.targetSalaryLpa,
      });

      const payload: Omit<JobAnalysis, 'id' | 'uid' | 'createdAt' | 'updatedAt'> = {
        company: data.company || company.trim() || 'Target Company',
        jobTitle: data.jobTitle,
        rawDescription: rawDescription.trim(),
        requiredExperience: data.requiredExperience,
        requiredSkills: data.requiredSkills,
        preferredSkills: data.preferredSkills,
        toolsAndTech: data.toolsAndTech,
        responsibilities: data.responsibilities,
        matchingSkills: data.matchingSkills,
        partialSkills: data.partialSkills,
        missingSkills: data.missingSkills,
        recommendedTopics: data.recommendedTopics,
        prepChecklist: data.prepChecklist,
        honestAssessment: data.honestAssessment,
      };

      const newId = await createJobAnalysis(uid, payload);
      await logStudyActivity(uid, {
        date: getTodayIsoDate(),
        minutesStudied: 0,
        tasksCompleted: 0,
        aiTokensUsed: tokensUsed,
        actionType: 'jd_analyzed',
        note: `Analyzed JD: ${data.jobTitle}`,
      });

      setSelectedReport({ id: newId, uid, ...payload });
      invalidate('jobAnalyses');
      invalidate('activityLogs');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to analyze job description.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Job Description Analyzer
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Extract required competencies from any real job posting and compare them honestly against your verified skill profile.
        </p>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      <form
        onSubmit={handleAnalyze}
        className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Paste Target Job Description
          </h3>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_JOB_DESCRIPTIONS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setCompany(sample.company);
                  setRawDescription(sample.description);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Load: {sample.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Company Name (Optional)
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Razorpay, FinEdge Payments..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Job Description Text
            </label>
            <textarea
              rows={6}
              required
              value={rawDescription}
              onChange={(e) => setRawDescription(e.target.value)}
              placeholder="Paste responsibilities, required skills, experience, and tech stack..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={analyzing}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Briefcase className="h-4 w-4" />
            <span>{analyzing ? 'Analyzing Skill Gaps...' : 'Analyze Job Description'}</span>
          </button>
        </div>
      </form>

      {/* Skill Gap Report */}
      {activeReport && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {activeReport.company} · Experience: {activeReport.requiredExperience}
              </p>
              <h3 className="mt-0.5 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {activeReport.jobTitle}
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Tools: {activeReport.toolsAndTech.join(', ')}
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Honest Readiness Assessment</p>
            <p className="mt-1 leading-relaxed">{activeReport.honestAssessment}</p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Matching Skills ({activeReport.matchingSkills.length})
              </h4>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                {activeReport.matchingSkills.length === 0 ? (
                  <li className="text-xs text-slate-500">None at target threshold yet</li>
                ) : (
                  activeReport.matchingSkills.map((s, i) => <li key={i}>· {s}</li>)
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Partially Matching ({activeReport.partialSkills.length})
              </h4>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                {activeReport.partialSkills.length === 0 ? (
                  <li className="text-xs text-slate-500">None identified</li>
                ) : (
                  activeReport.partialSkills.map((s, i) => <li key={i}>· {s}</li>)
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
                Missing Skills ({activeReport.missingSkills.length})
              </h4>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                {activeReport.missingSkills.length === 0 ? (
                  <li className="text-xs text-slate-500">No critical gaps detected</li>
                ) : (
                  activeReport.missingSkills.map((s, i) => <li key={i}>· {s}</li>)
                )}
              </ul>
            </div>
          </div>

          <div className="mt-6 grid gap-6 border-t border-slate-200 pt-5 md:grid-cols-2 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Recommended Study Topics
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
                {activeReport.recommendedTopics.map((topic, i) => (
                  <li key={i}>{topic}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Interview Preparation Checklist
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
                {activeReport.prepChecklist.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Saved Reports List */}
      {jobAnalyses.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Saved Job Analyses
          </h3>
          <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
            {jobAnalyses.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                <button
                  type="button"
                  onClick={() => setSelectedReport(item)}
                  className="text-left hover:underline"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.jobTitle} · {item.company}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.matchingSkills.length} matching · {item.missingSkills.length} missing
                  </p>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!uid) return;
                    await deleteJobAnalysis(uid, item.id);
                    if (selectedReport?.id === item.id) setSelectedReport(null);
                    invalidate('jobAnalyses');
                  }}
                  aria-label="Delete job analysis"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
