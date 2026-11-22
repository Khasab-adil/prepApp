export type ThemeMode = 'light' | 'dark';

export type ExplanationLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type RoadmapHorizon = 7 | 30 | 60 | 90;

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  currentEducation: string;
  currentRole: string;
  yearsOfExperience: number;
  currentSkills: string[];
  targetRole: string;
  targetSalaryLpa: number;
  dailyStudyHours: number;
  preferredLanguage: string;
  targetLocation: string;
  jobSearchTimeline: string;
  onboardingCompleted: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserSkill {
  id: string;
  uid: string;
  name: string;
  category: string;
  score: number;
  targetScore: number;
  basis: string;
  source: 'seed' | 'assessment' | 'self_reported' | 'practice';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AssessmentQuestion {
  id: string;
  skillArea: string;
  type: 'mcq' | 'descriptive';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prompt: string;
  options: string[];
  correctOptionIndex?: number;
  userAnswer: string;
  score: number;
  maxScore: number;
  explanation: string;
  evaluationBasis: string;
}

export interface Assessment {
  id: string;
  uid: string;
  title: string;
  focusAreas: string[];
  status: 'in_progress' | 'completed';
  overallScore: number;
  scoreBasis: string;
  strongAreas: string[];
  weakAreas: string[];
  summaryFeedback: string;
  questions: AssessmentQuestion[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RoadmapTopic {
  topicId: string;
  title: string;
  objective: string;
  durationMinutes: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  studyMaterial: string;
  practicalExercise: string;
  expectedOutcome: string;
  completionCriteria: string;
  prerequisites: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

export interface RoadmapPhase {
  phaseNumber: number;
  title: string;
  rationale: string;
  topics: RoadmapTopic[];
}

export interface Roadmap {
  id: string;
  uid: string;
  title: string;
  horizonDays: RoadmapHorizon;
  targetRole: string;
  targetSalaryLpa: number;
  dailyHours: number;
  isActive: boolean;
  phases: RoadmapPhase[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DailyTask {
  id: string;
  uid: string;
  date: string;
  roadmapId: string;
  topicTitle: string;
  category: string;
  durationMinutes: number;
  learningContent: string;
  practiceQuestion: string;
  userAnswer: string;
  aiFeedback: string;
  score: number;
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
  completedDate: string;
  isSeeded: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
  codeSnippet?: string;
  lineByLineExplanation?: string[];
  followUpQuestion?: string;
  timestamp: string;
}

export interface TutorThread {
  id: string;
  uid: string;
  topic: string;
  level: ExplanationLevel;
  roadmapPhase: string;
  messages: TutorMessage[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface JobAnalysis {
  id: string;
  uid: string;
  company: string;
  jobTitle: string;
  rawDescription: string;
  requiredExperience: string;
  requiredSkills: string[];
  preferredSkills: string[];
  toolsAndTech: string[];
  responsibilities: string[];
  matchingSkills: string[];
  partialSkills: string[];
  missingSkills: string[];
  recommendedTopics: string[];
  prepChecklist: string[];
  honestAssessment: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InterviewQAItem {
  id: string;
  question: string;
  category: string;
  userAnswer: string;
  technicalScore: number;
  clarityScore: number;
  feedback: string;
  missingConcepts: string[];
  improvedAnswer: string;
}

export interface MockInterview {
  id: string;
  uid: string;
  track: string;
  difficulty: string;
  status: 'in_progress' | 'completed';
  overallScore: number;
  recurringWeaknesses: string[];
  improvementPlan: string[];
  qaItems: InterviewQAItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  statement: string;
  examples: { input: string; output: string; explanation: string }[];
  hints: string[];
  expectedConcepts: string[];
  starterCode: string;
}

export interface CodingSubmission {
  id: string;
  uid: string;
  problemId: string;
  problemTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  language: string;
  code: string;
  status: 'passed' | 'needs_improvement';
  score: number;
  timeComplexity: string;
  spaceComplexity: string;
  aiFeedback: string;
  edgeCasesMissed: string[];
  improvedApproach: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface ChecklistItem {
  id: string;
  item: string;
  done: boolean;
}

export interface PortfolioProject {
  id: string;
  uid: string;
  title: string;
  difficulty: string;
  targetRole: string;
  summary: string;
  techStack: string[];
  architectureNotes: string;
  databaseDesign: string;
  apiSpecs: string[];
  milestones: ProjectMilestone[];
  testingChecklist: ChecklistItem[];
  deploymentChecklist: ChecklistItem[];
  resumeBullets: string[];
  isSeeded: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ActivityLog {
  id: string;
  uid: string;
  date: string;
  minutesStudied: number;
  tasksCompleted: number;
  aiTokensUsed: number;
  actionType: string;
  note: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReadinessCriterion {
  label: string;
  weightPercent: number;
  scorePercent: number;
  weightedPoints: number;
  detail: string;
}

export interface ReadinessSummary {
  totalPercent: number;
  tierLabel: string;
  criteria: ReadinessCriterion[];
}
