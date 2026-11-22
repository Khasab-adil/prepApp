import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { z } from 'zod';

const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('AI provider key is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateStructuredJson<T>(params: {
  systemInstruction: string;
  prompt: string;
  responseSchema: Record<string, unknown>;
  validator: z.ZodType<T>;
  maxRetries?: number;
}): Promise<{ data: T; tokensUsed: number }> {
  const { systemInstruction, prompt, responseSchema, validator, maxRetries = 2 } = params;
  const ai = getAiClient();
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('AI returned an empty response.');
      }

      const parsed = JSON.parse(rawText);
      const validated = validator.parse(parsed);
      const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;

      return { data: validated, tokensUsed };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = 400 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(
    `AI generation failed after retries: ${lastError instanceof Error ? lastError.message : 'Invalid response format'}`
  );
}

// 1. Skill Assessment Generation
const GeneratedAssessmentSchema = z.object({
  title: z.string().min(1),
  questions: z
    .array(
      z.object({
        id: z.string().min(1),
        skillArea: z.string().min(1),
        type: z.enum(['mcq', 'descriptive']),
        difficulty: z.enum(['Easy', 'Medium', 'Hard']),
        prompt: z.string().min(1),
        options: z.array(z.string()),
        correctOptionIndex: z.number().int().min(-1).max(3),
      })
    )
    .min(4)
    .max(10),
});

export async function generateSkillAssessment(input: {
  targetRole: string;
  targetSalaryLpa: number;
  yearsOfExperience: number;
  focusAreas: string[];
}) {
  const systemInstruction = `You are a senior technical interviewer designing a diagnostic skill assessment for AabPrepKarro AI.
Generate realistic, practical technical questions tailored to the candidate's target role (${input.targetRole}, target ${input.targetSalaryLpa} LPA, ${input.yearsOfExperience} yrs experience).
Include a mix of multiple-choice (type: "mcq", 4 options, correctOptionIndex 0..3) and short descriptive questions (type: "descriptive", options: [], correctOptionIndex: -1).
Keep prompts concise and unambiguous.`;

  const prompt = `Create a 6-question skill assessment covering these focus areas: ${input.focusAreas.join(', ')}.
Include 4 MCQ questions and 2 descriptive questions. Provide unique ids like "q1".."q6".`;

  return generateStructuredJson({
    systemInstruction,
    prompt,
    validator: GeneratedAssessmentSchema,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              skillArea: { type: Type.STRING },
              type: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              prompt: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctOptionIndex: { type: Type.INTEGER },
            },
            required: ['id', 'skillArea', 'type', 'difficulty', 'prompt', 'options', 'correctOptionIndex'],
          },
        },
      },
      required: ['title', 'questions'],
    },
  });
}

// 2. Skill Assessment Evaluation
const EvaluatedAssessmentSchema = z.object({
  overallScore: z.number().min(0).max(100),
  scoreBasis: z.string().min(1),
  strongAreas: z.array(z.string()),
  weakAreas: z.array(z.string()),
  summaryFeedback: z.string().min(1),
  evaluatedQuestions: z.array(
    z.object({
      id: z.string(),
      score: z.number().min(0).max(100),
      explanation: z.string(),
      evaluationBasis: z.string(),
    })
  ),
  skillUpdates: z.array(
    z.object({
      skillArea: z.string(),
      estimatedScore: z.number().min(0).max(100),
      basis: z.string(),
    })
  ),
});

export async function evaluateSkillAssessment(input: {
  targetRole: string;
  questions: {
    id: string;
    skillArea: string;
    type: string;
    prompt: string;
    options: string[];
    correctOptionIndex?: number;
    userAnswer: string;
  }[];
}) {
  const systemInstruction = `You are a fair, rigorous technical evaluator for AabPrepKarro AI.
Evaluate each submitted answer against technical accuracy and completeness.
IMPORTANT: Never claim this score is a scientifically validated or psychometric certification. In scoreBasis and evaluationBasis, clearly explain what answers/criteria drove each score (e.g., "Based on 4/4 correct MCQs and partial coverage of ACID isolation levels in descriptive Q5").`;

  const prompt = `Target role: ${input.targetRole}
Questions and user answers:
${JSON.stringify(input.questions, null, 2)}

Evaluate all questions, compute overallScore (0-100), strongAreas, weakAreas, summaryFeedback, and updated skill estimates.`;

  return generateStructuredJson({
    systemInstruction,
    prompt,
    validator: EvaluatedAssessmentSchema,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.NUMBER },
        scoreBasis: { type: Type.STRING },
        strongAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
        weakAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
        summaryFeedback: { type: Type.STRING },
        evaluatedQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              score: { type: Type.NUMBER },
              explanation: { type: Type.STRING },
              evaluationBasis: { type: Type.STRING },
            },
            required: ['id', 'score', 'explanation', 'evaluationBasis'],
          },
        },
        skillUpdates: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              skillArea: { type: Type.STRING },
              estimatedScore: { type: Type.NUMBER },
              basis: { type: Type.STRING },
            },
            required: ['skillArea', 'estimatedScore', 'basis'],
          },
        },
      },
      required: ['overallScore', 'scoreBasis', 'strongAreas', 'weakAreas', 'summaryFeedback', 'evaluatedQuestions', 'skillUpdates'],
    },
  });
}

// 3. Personalized Roadmap Generator
const RoadmapResponseSchema = z.object({
  title: z.string().min(1),
  phases: z
    .array(
      z.object({
        phaseNumber: z.number().int().min(1),
        title: z.string().min(1),
        rationale: z.string().min(1),
        topics: z
          .array(
            z.object({
              topicId: z.string().min(1),
              title: z.string().min(1),
              objective: z.string().min(1),
              durationMinutes: z.number().int().min(15).max(360),
              difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
              studyMaterial: z.string().min(1),
              practicalExercise: z.string().min(1),
              expectedOutcome: z.string().min(1),
              completionCriteria: z.string().min(1),
              prerequisites: z.array(z.string()),
            })
          )
          .min(1),
      })
    )
    .min(3)
    .max(9),
});

export async function generatePersonalizedRoadmap(input: {
  horizonDays: 7 | 30 | 60 | 90;
  targetRole: string;
  targetSalaryLpa: number;
  yearsOfExperience: number;
  dailyStudyHours: number;
  weakSkills: { name: string; score: number }[];
  strongSkills: { name: string; score: number }[];
  jdMissingSkills: string[];
}) {
  const phaseCount = input.horizonDays === 7 ? 3 : input.horizonDays === 30 ? 5 : input.horizonDays === 60 ? 7 : 9;
  const systemInstruction = `You are a principal software architect & career mentor for AabPrepKarro AI.
Design a prerequisite-ordered study roadmap for ${input.targetRole} targeting ₹${input.targetSalaryLpa} LPA.
Do NOT generate random topics. Follow logical progression with prerequisites (e.g., Java Fundamentals -> OOP & Collections -> Spring Boot -> SQL/PostgreSQL & JPA -> Microservices -> DSA -> System Design -> Portfolio Projects -> Interview Prep).
Prioritize the candidate's weak skills and any missing skills from target Job Descriptions.`;

  const prompt = `Create a ${input.horizonDays}-day roadmap with ${phaseCount} structured phases (2-3 actionable topics per phase).
Candidate context:
- Experience: ${input.yearsOfExperience} years
- Daily study budget: ${input.dailyStudyHours} hours/day
- Weakest skills needing focus: ${input.weakSkills.map((s) => `${s.name} (${s.score}/100)`).join(', ') || 'General backend baseline'}
- Strongest skills: ${input.strongSkills.map((s) => `${s.name} (${s.score}/100)`).join(', ') || 'None verified yet'}
- Missing JD skills: ${input.jdMissingSkills.join(', ') || 'None specified'}

Provide concise, concrete studyMaterial, practicalExercise, expectedOutcome, completionCriteria, and prerequisites for each topic.`;

  return generateStructuredJson({
    systemInstruction,
    prompt,
    validator: RoadmapResponseSchema,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        phases: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phaseNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              rationale: { type: Type.STRING },
              topics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topicId: { type: Type.STRING },
                    title: { type: Type.STRING },
                    objective: { type: Type.STRING },
                    durationMinutes: { type: Type.INTEGER },
                    difficulty: { type: Type.STRING },
                    studyMaterial: { type: Type.STRING },
                    practicalExercise: { type: Type.STRING },
                    expectedOutcome: { type: Type.STRING },
                    completionCriteria: { type: Type.STRING },
                    prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: [
                    'topicId',
                    'title',
                    'objective',
                    'durationMinutes',
                    'difficulty',
                    'studyMaterial',
                    'practicalExercise',
                    'expectedOutcome',
                    'completionCriteria',
                    'prerequisites',
                  ],
                },
              },
            },
            required: ['phaseNumber', 'title', 'rationale', 'topics'],
          },
        },
      },
      required: ['title', 'phases'],
    },
  });
}

// 4. Daily Task Answer Evaluation & Adaptive Plan
const TaskFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  feedback: z.string().min(1),
  keyTakeaway: z.string().min(1),
  adaptiveRecommendation: z.string().min(1),
});

export async function evaluateDailyTaskAnswer(input: {
  topicTitle: string;
  category: string;
  practiceQuestion: string;
  userAnswer: string;
  targetRole: string;
}) {
  const systemInstruction = `You are an encouraging, technically precise backend engineering coach for AabPrepKarro AI.
Evaluate the user's answer to their daily practice question, identify what was accurate vs missing, and recommend the next micro-step.`;

  const prompt = `Target Role: ${input.targetRole}
Topic: ${input.topicTitle} (${input.category})
Question: ${input.practiceQuestion}
User Answer: ${input.userAnswer}

Score 0-100, determine if passed (>= 60), provide constructive feedback, a concise keyTakeaway, and an adaptiveRecommendation for tomorrow's mission.`;

  return generateStructuredJson({
    systemInstruction,
    prompt,
    validator: TaskFeedbackSchema,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        passed: { type: Type.BOOLEAN },
        feedback: { type: Type.STRING },
        keyTakeaway: { type: Type.STRING },
        adaptiveRecommendation: { type: Type.STRING },
      },
      required: ['score', 'passed', 'feedback', 'keyTakeaway', 'adaptiveRecommendation'],
    },
  });
}

// 5. Contextual AI Learning Assistant (Tutor)
const TutorResponseSchema = z.object({
  explanation: z.string().min(1),
  realWorldExample: z.string().min(1),
  codeSnippet: z.string(),
  lineByLineBreakdown: z.array(z.string()),
  followUpQuestion: z.string().min(1),
  knowledgeGapNote: z.string(),
});

export async function runAiTutorTurn(input: {
  topic: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  roadmapPhase: string;
  targetRole: string;
  preferredLanguage: string;
  history: { role: string; content: string }[];
  userMessage: string;
}) {
  const systemInstruction = `You are the contextual AI Learning Assistant in AabPrepKarro AI.
Tailor every explanation to:
- Explanation Level: ${input.level}
- Target Role: ${input.targetRole}
- Active Roadmap Phase: ${input.roadmapPhase || 'Core Backend Foundations'}
- Preferred Language Style: ${input.preferredLanguage} (keep technical terms in English; if Hinglish is requested, blend crisp Hindi conversational clarity with English technical precision).
Include a real-world engineering example, clean Java/SQL code when relevant, a line-by-line breakdown, and a probing follow-up question to verify understanding.`;

  const historyText = input.history
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const prompt = `Topic: ${input.topic}
Recent Conversation:
${historyText || 'None'}

Latest Learner Message: ${input.userMessage}`;

  return generateStructuredJson({
    systemInstruction,
    prompt,
    validator: TutorResponseSchema,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        explanation: { type: Type.STRING },
        realWorldExample: { type: Type.STRING },
        codeSnippet: { type: Type.STRING },
        lineByLineBreakdown: { type: Type.ARRAY, items: { type: Type.STRING } },
        followUpQuestion: { type: Type.STRING },
        knowledgeGapNote: { type: Type.STRING },
      },
      required: ['explanation', 'realWorldExample', 'codeSnippet', 'lineByLineBreakdown', 'followUpQuestion', 'knowledgeGapNote'],
    },
  });
}

// 6. Job Description Analyzer
const JobAnalysisSchema = z.object({
  jobTitle: z.string().min(1),
  company: z.string(),
  requiredExperience: z.string().min(1),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  toolsAndTech: z.array(z.string()),
  responsibilities: z.array(z.string()),
  matchingSkills: z.array(z.string()),
  partialSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  recommendedTopics: z.array(z.string()),
  prepChecklist: z.array(z.string()),
  honestAssessment: z.string().min(1),
});

export async function analyzeJobDescription(input: {
  company: string;
  rawDescription: string;
  userSkills: { name: string; score: number }[];
  yearsOfExperience: number;
  targetSalaryLpa: number;
}) {
  const systemInstruction = `You are a candid technical career strategist in AabPrepKarro AI.
Extract structured requirements from the job description and compare them honestly against the candidate's verified skill profile.
CRITICAL RULE: Never falsely claim the candidate is qualified based solely on keyword overlap. Clearly distinguish strong matches (score >= 70), partial matches (score 40-69), and missing/gap skills (< 40 or absent).`;

  const prompt = `Company (user provided or infer from JD): ${input.company || 'Not specified'}
Candidate Experience: ${input.yearsOfExperience} years | Target Salary: ₹${input.targetSalaryLpa} LPA
Candidate Skill Scores:
${input.userSkills.map((s) => `- ${s.name}: ${s.score}/100`).join('\n')}

Job Description:
${input.rawDescription}`;

  return generateStructuredJson({
    systemInstruction,
    prompt,
    validator: JobAnalysisSchema,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        jobTitle: { type: Type.STRING },
        company: { type: Type.STRING },
        requiredExperience: { type: Type.STRING },
        requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        preferredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        toolsAndTech: { type: Type.ARRAY, items: { type: Type.STRING } },
        responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
        matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        partialSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
        prepChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
        honestAssessment: { type: Type.STRING },
      },
      required: [
        'jobTitle',
        'company',
        'requiredExperience',
        'requiredSkills',
        'preferredSkills',
        'toolsAndTech',
        'responsibilities',
        'matchingSkills',
        'partialSkills',
        'missingSkills',
        'recommendedTopics',
        'prepChecklist',
        'honestAssessment',
      ],
    },
  });
}

// 7. Mock Interview Questions Generator & Answer Evaluator
const InterviewQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().min(1),
        category: z.string().min(1),
        question: z.string().min(1),
      })
    )
    .min(3)
    .max(6),
});

export async function generateMockInterviewQuestions(input: {
  track: string;
  difficulty: string;
  targetRole: string;
  targetSalaryLpa: number;
  weakAreas: string[];
}) {
  const systemInstruction = `You are a seasoned technical hiring panelist conducting a ${input.track} interview (${input.difficulty}) for a ${input.targetRole} role (₹${input.targetSalaryLpa} LPA).
Generate 4 realistic, layered interview questions that probe real engineering depth rather than trivia.`;

  const prompt = `Interview Track: ${input.track}
Difficulty: ${input.difficulty}
Candidate Known Weak Areas: ${input.weakAreas.join(', ') || 'General'}
Generate 4 interview questions with ids "iq1".."iq4".`;

  return generateStructuredJson({
    systemInstruction,
    prompt,
    validator: InterviewQuestionsSchema,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              category: { type: Type.STRING },
              question: { type: Type.STRING },
            },
            required: ['id', 'category', 'question'],
          },
        },
      },
      required: ['questions'],
    },
  });
}

const EvaluatedInterviewSchema = z.object({
  overallScore: z.number().min(0).max(100),
  recurringWeaknesses: z.array(z.string()),
  improvementPlan: z.array(z.string()),
  evaluations: z.array(
    z.object({
      id: z.string(),
      technicalScore: z.number().min(0).max(100),
      clarityScore: z.number().min(0).max(100),
      feedback: z.string(),
      missingConcepts: z.array(z.string()),
      improvedAnswer: z.string(),
    })
  ),
});

export async function evaluateMockInterview(input: {
  track: string;
  difficulty: string;
  targetRole: string;
  qaItems: { id: string; category: string; question: string; userAnswer: string }[];
}) {
  const systemInstruction = `You are a constructive senior engineering interviewer in AabPrepKarro AI.
Evaluate each interview answer on technical correctness (0-100) and communication clarity/completeness (0-100).
Identify missing concepts, provide an exemplary improved answer, and synthesize recurring weaknesses and a concrete improvement plan.`;

  const prompt = `Track: ${input.track} | Difficulty: ${input.difficulty} | Target Role: ${input.targetRole}
Candidate Answers:
${JSON.stringify(input.qaItems, null, 2)}`;

  return generateStructuredJson({
    systemInstruction,
    prompt,
    validator: EvaluatedInterviewSchema,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.NUMBER },
        recurringWeaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvementPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
        evaluations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              technicalScore: { type: Type.NUMBER },
              clarityScore: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              missingConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvedAnswer: { type: Type.STRING },
            },
            required: ['id', 'technicalScore', 'clarityScore', 'feedback', 'missingConcepts', 'improvedAnswer'],
          },
        },
      },
      required: ['overallScore', 'recurringWeaknesses', 'improvementPlan', 'evaluations'],
    },
  });
}

// 8. Coding Practice Evaluator (Safe AI Code Review — no in-process arbitrary code execution)
const CodingEvalSchema = z.object({
  status: z.enum(['passed', 'needs_improvement']),
  score: z.number().min(0).max(100),
  timeComplexity: z.string().min(1),
  spaceComplexity: z.string().min(1),
  aiFeedback: z.string().min(1),
  edgeCasesMissed: z.array(z.string()),
  improvedApproach: z.string().min(1),
});

export async function evaluateCodingSolution(input: {
  problemTitle: string;
  statement: string;
  expectedConcepts: string[];
  code: string;
}) {
  const systemInstruction = `You are a principal Java engineer conducting a code review in AabPrepKarro AI.
Analyze the submitted Java code statically for algorithmic correctness, time/space complexity, null/boundary edge cases, concurrency safety (if applicable), and Java best practices.
Be honest: if the code is stubbed/TODO or buggy, mark status "needs_improvement" with a low score.`;

  const prompt = `Problem: ${input.problemTitle}
Statement: ${input.statement}
Expected Concepts: ${input.expectedConcepts.join(', ')}

Submitted Java Code:
\`\`\`java
${input.code}
\`\`\``;

  return generateStructuredJson({
    systemInstruction,
    prompt,
    validator: CodingEvalSchema,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING },
        score: { type: Type.NUMBER },
        timeComplexity: { type: Type.STRING },
        spaceComplexity: { type: Type.STRING },
        aiFeedback: { type: Type.STRING },
        edgeCasesMissed: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvedApproach: { type: Type.STRING },
      },
      required: ['status', 'score', 'timeComplexity', 'spaceComplexity', 'aiFeedback', 'edgeCasesMissed', 'improvedApproach'],
    },
  });
}

// 9. Portfolio Project Blueprint Generator
const PortfolioProjectSchema = z.object({
  title: z.string().min(1),
  difficulty: z.string().min(1),
  summary: z.string().min(1),
  techStack: z.array(z.string()).min(3),
  architectureNotes: z.string().min(1),
  databaseDesign: z.string().min(1),
  apiSpecs: z.array(z.string()).min(3),
  milestones: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
      })
    )
    .min(3)
    .max(6),
  testingChecklist: z.array(z.string()).min(3),
  deploymentChecklist: z.array(z.string()).min(3),
  resumeBullets: z.array(z.string()).min(2),
});

export async function generatePortfolioProject(input: {
  targetRole: string;
  targetSalaryLpa: number;
  focusSkill: string;
  difficulty: string;
}) {
  const systemInstruction = `You are a Staff Software Architect mentoring a candidate preparing for a ${input.targetRole} role (₹${input.targetSalaryLpa} LPA).
Recommend an impressive, resume-worthy backend engineering project (avoid trivial CRUD/todo apps) with concrete database tables, REST API endpoints, milestones, testing checklist, deployment checklist, and impact-focused resume bullets.`;

  const prompt = `Generate a ${input.difficulty} portfolio project emphasizing: ${input.focusSkill || 'Spring Boot, PostgreSQL, Microservices & Security'}.`;

  return generateStructuredJson({
    systemInstruction,
    prompt,
    validator: PortfolioProjectSchema,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        difficulty: { type: Type.STRING },
        summary: { type: Type.STRING },
        techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
        architectureNotes: { type: Type.STRING },
        databaseDesign: { type: Type.STRING },
        apiSpecs: { type: Type.ARRAY, items: { type: Type.STRING } },
        milestones: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['id', 'title', 'description'],
          },
        },
        testingChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
        deploymentChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
        resumeBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        'title',
        'difficulty',
        'summary',
        'techStack',
        'architectureNotes',
        'databaseDesign',
        'apiSpecs',
        'milestones',
        'testingChecklist',
        'deploymentChecklist',
        'resumeBullets',
      ],
    },
  });
}
