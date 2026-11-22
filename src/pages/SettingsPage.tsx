import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useCareerData } from '../hooks/useCareerData.ts';
import { updateUserProfile } from '../lib/firestoreRepo.ts';
import { ErrorBanner } from '../components/DataState.tsx';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const { uid, profile, streakStats, invalidate } = useCareerData();
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleQuickHoursUpdate = async (hours: number) => {
    if (!uid || !profile) return;
    setSaving(true);
    setErrorMsg(null);
    setSavedMsg(null);
    try {
      await updateUserProfile(uid, {
        ...profile,
        dailyStudyHours: hours,
      });
      invalidate('profile');
      setSavedMsg(`Daily study target updated to ${hours} hrs/day.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update study hours.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Workspace Settings
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Configure appearance, daily study capacity, and inspect AI usage telemetry.
        </p>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Appearance Theme
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Choose between high-clarity light mode and low-glare dark mode.
        </p>
        <div className="mt-4 inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Light Theme
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Dark Theme
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Daily Study Duration Preset
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Controls how future Daily Planner missions and Roadmaps size your daily workload.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 1.5, 2, 3, 4].map((hrs) => (
            <button
              key={hrs}
              type="button"
              disabled={saving}
              onClick={() => handleQuickHoursUpdate(hrs)}
              className={`rounded-lg border px-4 py-2 font-mono text-xs font-medium tabular-nums transition-colors ${
                profile?.dailyStudyHours === hrs
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {hrs} hrs/day
            </button>
          ))}
        </div>
        {savedMsg && <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">{savedMsg}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Data Provenance &amp; Usage Summary
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Study Time Logged</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {streakStats.totalMinutes} mins
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">AI Tokens Tracked</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {streakStats.totalTokens.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Account Session</p>
            <button
              type="button"
              onClick={logout}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Sign out of workspace
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
