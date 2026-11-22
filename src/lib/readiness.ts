import {
  ActivityLog,
  Assessment,
  CodingSubmission,
  MockInterview,
  PortfolioProject,
  ReadinessSummary,
  Roadmap,
  UserSkill,
} from '../types/career.ts';

export function getTodayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateReadiness(params: {
  skills: UserSkill[];
  assessments: Assessment[];
  activeRoadmap: Roadmap | null;
  interviews: MockInterview[];
  submissions: CodingSubmission[];
  projects: PortfolioProject[];
}): ReadinessSummary {
  const { skills, assessments, activeRoadmap, interviews, submissions, projects } = params;

  // 1. Skill Matrix Coverage (35% weight)
  let skillScorePercent = 0;
  let skillDetail = 'No skills tracked yet';
  if (skills.length > 0) {
    const ratios = skills.map((s) => {
      const target = s.targetScore > 0 ? s.targetScore : 80;
      return Math.min(100, Math.round((s.score / target) * 100));
    });
    skillScorePercent = Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length);
    const masteredCount = skills.filter((s) => s.score >= s.targetScore).length;
    skillDetail = `${masteredCount}/${skills.length} target skills at goal threshold`;
  }

  // 2. Verified Skill Assessments (20% weight)
  const completedAssessments = assessments.filter((a) => a.status === 'completed');
  let assessmentPercent = 0;
  let assessmentDetail = 'Complete at least 1 skill assessment';
  if (completedAssessments.length > 0) {
    assessmentPercent = Math.round(
      completedAssessments.reduce((sum, a) => sum + a.overallScore, 0) / completedAssessments.length
    );
    assessmentDetail = `Average across ${completedAssessments.length} completed assessment(s)`;
  }

  // 3. Active Roadmap Progress (20% weight)
  let roadmapPercent = 0;
  let roadmapDetail = 'Generate an active study roadmap';
  if (activeRoadmap && activeRoadmap.phases.length > 0) {
    const allTopics = activeRoadmap.phases.flatMap((p) => p.topics);
    const completedTopics = allTopics.filter((t) => t.status === 'completed').length;
    roadmapPercent = allTopics.length > 0 ? Math.round((completedTopics / allTopics.length) * 100) : 0;
    roadmapDetail = `${completedTopics}/${allTopics.length} roadmap topics completed`;
  }

  // 4. Mock Interview Performance (15% weight)
  const completedInterviews = interviews.filter((i) => i.status === 'completed');
  let interviewPercent = 0;
  let interviewDetail = 'Complete at least 1 mock interview';
  if (completedInterviews.length > 0) {
    interviewPercent = Math.round(
      completedInterviews.reduce((sum, i) => sum + i.overallScore, 0) / completedInterviews.length
    );
    interviewDetail = `Average across ${completedInterviews.length} mock interview(s)`;
  }

  // 5. Projects & Coding Execution (10% weight)
  const passedProblemIds = new Set(
    submissions.filter((s) => s.status === 'passed').map((s) => s.problemId)
  );
  const codingRatio = Math.min(1, passedProblemIds.size / 5);

  let projectRatio = 0;
  if (projects.length > 0) {
    const ratios = projects.map((p) => {
      const totalItems =
        p.milestones.length + p.testingChecklist.length + p.deploymentChecklist.length;
      if (totalItems === 0) return 0;
      const doneItems =
        p.milestones.filter((m) => m.completed).length +
        p.testingChecklist.filter((c) => c.done).length +
        p.deploymentChecklist.filter((d) => d.done).length;
      return doneItems / totalItems;
    });
    projectRatio = Math.max(...ratios);
  }
  const executionPercent = Math.round(((codingRatio * 0.5 + projectRatio * 0.5) * 100));
  const executionDetail = `${passedProblemIds.size}/5 coding problems passed · ${Math.round(projectRatio * 100)}% top project done`;

  const criteria = [
    {
      label: 'Skill Matrix Mastery',
      weightPercent: 35,
      scorePercent: skillScorePercent,
      weightedPoints: Number(((skillScorePercent * 35) / 100).toFixed(1)),
      detail: skillDetail,
    },
    {
      label: 'Verified Assessments',
      weightPercent: 20,
      scorePercent: assessmentPercent,
      weightedPoints: Number(((assessmentPercent * 20) / 100).toFixed(1)),
      detail: assessmentDetail,
    },
    {
      label: 'Roadmap Completion',
      weightPercent: 20,
      scorePercent: roadmapPercent,
      weightedPoints: Number(((roadmapPercent * 20) / 100).toFixed(1)),
      detail: roadmapDetail,
    },
    {
      label: 'Mock Interviews',
      weightPercent: 15,
      scorePercent: interviewPercent,
      weightedPoints: Number(((interviewPercent * 15) / 100).toFixed(1)),
      detail: interviewDetail,
    },
    {
      label: 'Coding & Projects',
      weightPercent: 10,
      scorePercent: executionPercent,
      weightedPoints: Number(((executionPercent * 10) / 100).toFixed(1)),
      detail: executionDetail,
    },
  ];

  const totalPercent = Math.min(
    100,
    Math.round(criteria.reduce((sum, c) => sum + c.weightedPoints, 0))
  );

  let tierLabel = 'Foundation Stage';
  if (totalPercent >= 80) tierLabel = 'Interview Ready';
  else if (totalPercent >= 60) tierLabel = 'Approaching Target';
  else if (totalPercent >= 35) tierLabel = 'Building Momentum';

  return {
    totalPercent,
    tierLabel,
    criteria,
  };
}

export function calculateStreak(logs: ActivityLog[], todayIso: string = getTodayIsoDate()): {
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  totalTokens: number;
} {
  const activeDates = new Set(
    logs.filter((l) => l.minutesStudied > 0 || l.tasksCompleted > 0).map((l) => l.date)
  );
  const totalMinutes = logs.reduce((sum, l) => sum + (l.minutesStudied || 0), 0);
  const totalTokens = logs.reduce((sum, l) => sum + (l.aiTokensUsed || 0), 0);

  if (activeDates.size === 0) {
    return { currentStreak: 0, longestStreak: 0, totalMinutes, totalTokens };
  }

  const sortedDates = Array.from(activeDates).sort();
  let longestStreak = 1;
  let running = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(`${sortedDates[i - 1]}T00:00:00Z`).getTime();
    const curr = new Date(`${sortedDates[i]}T00:00:00Z`).getTime();
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      running += 1;
      if (running > longestStreak) longestStreak = running;
    } else {
      running = 1;
    }
  }

  let currentStreak = 0;
  let cursor = new Date(`${todayIso}T00:00:00Z`);
  if (!activeDates.has(todayIso)) {
    cursor = new Date(cursor.getTime() - 86400000);
  }
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (activeDates.has(key)) {
      currentStreak += 1;
      cursor = new Date(cursor.getTime() - 86400000);
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak, totalMinutes, totalTokens };
}
