import { describe, expect, it } from 'vitest';
import { calculateReadiness, calculateStreak } from './readiness.ts';
import { JAVA_BACKEND_SKILLS, JAVA_CODING_PROBLEMS } from '../data/seedCurriculum.ts';
import {
  ActivityLog,
  Assessment,
  CodingSubmission,
  MockInterview,
  PortfolioProject,
  Roadmap,
  UserSkill,
} from '../types/career.ts';

describe('Deterministic Job Readiness Engine', () => {
  it('computes 0% readiness when user has no skills, assessments, roadmap, interviews, or projects', () => {
    const result = calculateReadiness({
      skills: [],
      assessments: [],
      activeRoadmap: null,
      interviews: [],
      submissions: [],
      projects: [],
    });

    expect(result.totalPercent).toBe(0);
    expect(result.tierLabel).toBe('Foundation Stage');
    expect(result.criteria).toHaveLength(5);
    expect(result.criteria.reduce((s, c) => s + c.weightPercent, 0)).toBe(100);
  });

  it('computes weighted readiness deterministically across all 5 criteria', () => {
    const skills: UserSkill[] = [
      { id: '1', uid: 'u1', name: 'Core Java', category: 'Core Java', score: 80, targetScore: 80, basis: 'Assessed', source: 'assessment' },
      { id: '2', uid: 'u1', name: 'Spring Boot', category: 'Backend', score: 80, targetScore: 80, basis: 'Assessed', source: 'assessment' },
    ];
    const assessments: Assessment[] = [
      {
        id: 'a1',
        uid: 'u1',
        title: 'Java Check',
        focusAreas: ['Core Java'],
        status: 'completed',
        overallScore: 80,
        scoreBasis: '4/5 correct',
        strongAreas: ['Core Java'],
        weakAreas: [],
        summaryFeedback: 'Solid',
        questions: [],
      },
    ];
    const activeRoadmap: Roadmap = {
      id: 'r1',
      uid: 'u1',
      title: '30d Plan',
      horizonDays: 30,
      targetRole: 'Java Backend Developer',
      targetSalaryLpa: 9,
      dailyHours: 2,
      isActive: true,
      phases: [
        {
          phaseNumber: 1,
          title: 'Phase 1',
          rationale: 'Foundations',
          topics: [
            {
              topicId: 't1',
              title: 'Topic 1',
              objective: 'Obj',
              durationMinutes: 30,
              difficulty: 'Beginner',
              studyMaterial: 'Mat',
              practicalExercise: 'Ex',
              expectedOutcome: 'Out',
              completionCriteria: 'Crit',
              prerequisites: [],
              status: 'completed',
            },
            {
              topicId: 't2',
              title: 'Topic 2',
              objective: 'Obj',
              durationMinutes: 30,
              difficulty: 'Beginner',
              studyMaterial: 'Mat',
              practicalExercise: 'Ex',
              expectedOutcome: 'Out',
              completionCriteria: 'Crit',
              prerequisites: [],
              status: 'pending',
            },
          ],
        },
      ],
    };
    const interviews: MockInterview[] = [
      {
        id: 'i1',
        uid: 'u1',
        track: 'Java',
        difficulty: 'Mid-Level (₹9 LPA)',
        status: 'completed',
        overallScore: 70,
        recurringWeaknesses: [],
        improvementPlan: [],
        qaItems: [],
      },
    ];
    const submissions: CodingSubmission[] = [
      {
        id: 'c1',
        uid: 'u1',
        problemId: 'p1',
        problemTitle: 'Two Sum',
        difficulty: 'Easy',
        language: 'Java',
        code: '...',
        status: 'passed',
        score: 90,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
        aiFeedback: 'Good',
        edgeCasesMissed: [],
        improvedApproach: 'Optimal',
      },
    ];
    const projects: PortfolioProject[] = [
      {
        id: 'pr1',
        uid: 'u1',
        title: 'Wallet API',
        difficulty: 'Intermediate',
        targetRole: 'Java Backend Developer',
        summary: 'Summary',
        techStack: ['Java'],
        architectureNotes: 'Layered',
        databaseDesign: 'Postgres',
        apiSpecs: [],
        milestones: [{ id: 'm1', title: 'M1', description: 'D', completed: true }],
        testingChecklist: [{ id: 't1', item: 'T1', done: true }],
        deploymentChecklist: [{ id: 'd1', item: 'D1', done: false }],
        resumeBullets: [],
        isSeeded: false,
      },
    ];

    const result = calculateReadiness({
      skills,
      assessments,
      activeRoadmap,
      interviews,
      submissions,
      projects,
    });

    // 35% of 100 = 35; 20% of 80 = 16; 20% of 50 = 10; 15% of 70 = 10.5; 10% of (0.2*0.5 + 2/3*0.5)*100 = 4.3
    expect(result.totalPercent).toBeGreaterThan(70);
    expect(result.totalPercent).toBeLessThan(85);
    expect(result.tierLabel).toBe('Approaching Target');
  });
});

describe('Study Streak Calculator', () => {
  it('calculates current and longest consecutive study streaks accurately', () => {
    const logs: ActivityLog[] = [
      { id: '1', uid: 'u1', date: '2026-11-10', minutesStudied: 30, tasksCompleted: 1, aiTokensUsed: 100, actionType: 'task', note: '' },
      { id: '2', uid: 'u1', date: '2026-11-11', minutesStudied: 45, tasksCompleted: 1, aiTokensUsed: 120, actionType: 'task', note: '' },
      { id: '3', uid: 'u1', date: '2026-11-13', minutesStudied: 30, tasksCompleted: 1, aiTokensUsed: 90, actionType: 'task', note: '' },
      { id: '4', uid: 'u1', date: '2026-11-14', minutesStudied: 60, tasksCompleted: 2, aiTokensUsed: 200, actionType: 'task', note: '' },
    ];

    const stats = calculateStreak(logs, '2026-11-14');
    expect(stats.currentStreak).toBe(2);
    expect(stats.longestStreak).toBe(2);
    expect(stats.totalMinutes).toBe(165);
    expect(stats.totalTokens).toBe(510);
  });
});

describe('Seed Curriculum Integrity', () => {
  it('includes all 17 Java Backend competencies and starter Java coding problems', () => {
    expect(JAVA_BACKEND_SKILLS).toHaveLength(17);
    expect(JAVA_CODING_PROBLEMS.length).toBeGreaterThanOrEqual(5);
  });
});
