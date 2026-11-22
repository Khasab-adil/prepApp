import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useCareerData } from '../hooks/useCareerData.ts';
import { updateUserProfile } from '../lib/firestoreRepo.ts';
import { ErrorBanner, LoadingRows } from '../components/DataState.tsx';

export function ProfilePage() {
  const { uid, profile, isLoading, invalidate } = useCareerData();

  const [fullName, setFullName] = useState('');
  const [currentEducation, setCurrentEducation] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('1');
  const [skillsText, setSkillsText] = useState('');
  const [targetRole, setTargetRole] = useState('Java Backend Developer');
  const [targetSalaryLpa, setTargetSalaryLpa] = useState('9');
  const [dailyStudyHours, setDailyStudyHours] = useState('2');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [targetLocation, setTargetLocation] = useState('Bengaluru, India');
  const [jobSearchTimeline, setJobSearchTimeline] = useState('90 days');

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setCurrentEducation(profile.currentEducation);
      setCurrentRole(profile.currentRole);
      setYearsOfExperience(String(profile.yearsOfExperience));
      setSkillsText(profile.currentSkills.join(', '));
      setTargetRole(profile.targetRole);
      setTargetSalaryLpa(String(profile.targetSalaryLpa));
      setDailyStudyHours(String(profile.dailyStudyHours));
      setPreferredLanguage(profile.preferredLanguage);
      setTargetLocation(profile.targetLocation);
      setJobSearchTimeline(profile.jobSearchTimeline);
    }
  }, [profile]);

  if (isLoading) {
    return <LoadingRows rows={6} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !profile) return;
    setSaving(true);
    setErrorMsg(null);
    setSavedNotice(false);

    try {
      const parsedSkills = skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 40);

      await updateUserProfile(uid, {
        fullName: fullName.trim() || 'Developer',
        email: profile.email,
        currentEducation: currentEducation.trim(),
        currentRole: currentRole.trim(),
        yearsOfExperience: Math.max(0, Math.min(50, Number(yearsOfExperience) || 0)),
        currentSkills: parsedSkills,
        targetRole: targetRole.trim() || 'Java Backend Developer',
        targetSalaryLpa: Math.max(1, Math.min(300, Number(targetSalaryLpa) || 9)),
        dailyStudyHours: Math.max(0.5, Math.min(16, Number(dailyStudyHours) || 2)),
        preferredLanguage,
        targetLocation: targetLocation.trim() || 'India',
        jobSearchTimeline,
        onboardingCompleted: true,
      });
      invalidate('profile');
      setSavedNotice(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save career profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Career Profile &amp; Targets
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Every AI roadmap, assessment, and daily mission adapts to your experience, daily study capacity, and target ₹ LPA compensation.
        </p>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={profile?.email || ''}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Current Education
            </label>
            <input
              type="text"
              value={currentEducation}
              onChange={(e) => setCurrentEducation(e.target.value)}
              placeholder="e.g., B.Tech Computer Science"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Current Job Role
            </label>
            <input
              type="text"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              placeholder="e.g., Junior Software Engineer / Graduate"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Years of Experience
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Target Job Role
            </label>
            <input
              type="text"
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Target Salary (₹ LPA)
            </label>
            <input
              type="number"
              min="1"
              max="300"
              step="0.5"
              required
              value={targetSalaryLpa}
              onChange={(e) => setTargetSalaryLpa(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Daily Learning Budget (Hours / Day)
            </label>
            <input
              type="number"
              min="0.5"
              max="16"
              step="0.5"
              required
              value={dailyStudyHours}
              onChange={(e) => setDailyStudyHours(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Preferred Learning Language
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="English">English</option>
              <option value="Hinglish">Hinglish (Hindi + English Tech)</option>
              <option value="Hindi">Hindi</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Target Job Location
            </label>
            <input
              type="text"
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
              placeholder="e.g., Bengaluru, Hyderabad, Pune, Remote"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Expected Job-Search Timeline
            </label>
            <select
              value={jobSearchTimeline}
              onChange={(e) => setJobSearchTimeline(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="30 days">30 days</option>
              <option value="60 days">60 days</option>
              <option value="90 days">90 days</option>
              <option value="180 days">180 days</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Current Technical Skills (comma-separated)
            </label>
            <textarea
              rows={2}
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="Core Java, OOP, SQL, Spring Boot, Git..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div>
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                Profile saved to your account
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Career Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
