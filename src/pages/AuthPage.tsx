import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { ErrorBanner } from '../components/DataState.tsx';
import workspaceHeroImg from '../assets/images/auth_workspace_visual_1794655174141.jpg';

export function AuthPage() {
  const { signInWithGoogle, authError, clearAuthError } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [signingIn, setSigningIn] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      // Error surfaced via authError
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-5">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
          AabPrepKarro AI
        </span>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex dark:text-slate-400">
          <a href="#features" className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap">
            Roadmaps
          </a>
          <a href="#features" className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap">
            Assessments
          </a>
          <a href="#features" className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap">
            Mock Interviews
          </a>
          <a href="#features" className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap">
            Job Analyzer
          </a>
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {signingIn ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 lg:py-16">
        <div className="grid items-stretch gap-10 lg:grid-cols-12">
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Personal AI Career Coach · Java Backend &amp; ₹9 LPA Track
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50" style={{ textWrap: 'balance' }}>
              Learn smarter. Prepare better. Get hired.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              AabPrepKarro AI turns your current engineering skills into a structured, measurable daily preparation system—combining diagnostic assessments, prerequisite-ordered roadmaps, contextual tutoring, job-description gap reports, and mock interviews.
            </p>

            {authError && (
              <div className="mt-5">
                <ErrorBanner message={authError} onDismiss={clearAuthError} />
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="inline-flex items-center gap-2.5 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
              >
                <span>{signingIn ? 'Connecting your workspace...' : 'Continue with Google'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Persisted private workspace · Pre-configured for ₹9 LPA Java Backend prep
              </span>
            </div>

            <div id="features" className="mt-10 grid gap-4 border-t border-slate-200 pt-8 sm:grid-cols-2 dark:border-slate-800">
              {[
                'Diagnostic skill assessments with transparent score basis',
                '7, 30, 60 & 90-day prerequisite-ordered study roadmaps',
                'Honest JD skill-gap analyzer & mock interview evaluator',
                'Deterministic job readiness tracking & Java coding practice',
              ].map((point) => (
                <div key={point} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {!imgFailed ? (
                <img
                  src={workspaceHeroImg}
                  alt="AabPrepKarro AI software engineering preparation workspace"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-slate-100 p-8 text-center dark:bg-slate-800">
                  <p className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                    AabPrepKarro AI Workspace
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
                    Structured roadmaps, daily tasks, AI code reviews, and transparent readiness metrics.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
