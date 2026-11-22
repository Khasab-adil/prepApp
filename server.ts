import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { createServer as createViteServer } from 'vite';
import { requireAuth, aiRateLimiter, AuthRequest } from './server/authMiddleware.ts';
import {
  analyzeJobDescription,
  evaluateCodingSolution,
  evaluateDailyTaskAnswer,
  evaluateMockInterview,
  evaluateSkillAssessment,
  generateMockInterviewQuestions,
  generatePersonalizedRoadmap,
  generatePortfolioProject,
  generateSkillAssessment,
  runAiTutorTurn,
} from './server/aiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // Basic security headers compatible with AI Studio iframe
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'aabprepkarro-ai', timestamp: new Date().toISOString() });
  });

  // Protected AI Endpoints
  app.post('/api/ai/assessment/generate', requireAuth, aiRateLimiter, async (req: AuthRequest, res) => {
    const schema = z.object({
      targetRole: z.string().min(1).max(120),
      targetSalaryLpa: z.number().min(1).max(300),
      yearsOfExperience: z.number().min(0).max(50),
      focusAreas: z.array(z.string().min(1).max(80)).min(1).max(12),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid assessment request parameters.' });
    }
    try {
      const result = await generateSkillAssessment(parsed.data);
      return res.json(result);
    } catch (err) {
      console.error('Assessment generation error:', err);
      return res.status(502).json({ error: err instanceof Error ? err.message : 'AI service unavailable.' });
    }
  });

  app.post('/api/ai/assessment/evaluate', requireAuth, aiRateLimiter, async (req: AuthRequest, res) => {
    const schema = z.object({
      targetRole: z.string().min(1).max(120),
      questions: z
        .array(
          z.object({
            id: z.string(),
            skillArea: z.string(),
            type: z.string(),
            prompt: z.string(),
            options: z.array(z.string()),
            correctOptionIndex: z.number().optional(),
            userAnswer: z.string().max(4000),
          })
        )
        .min(1)
        .max(20),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid assessment submission payload.' });
    }
    try {
      const result = await evaluateSkillAssessment(parsed.data);
      return res.json(result);
    } catch (err) {
      console.error('Assessment evaluation error:', err);
      return res.status(502).json({ error: err instanceof Error ? err.message : 'AI evaluation unavailable.' });
    }
  });

  app.post('/api/ai/roadmap/generate', requireAuth, aiRateLimiter, async (req: AuthRequest, res) => {
    const schema = z.object({
      horizonDays: z.union([z.literal(7), z.literal(30), z.literal(60), z.literal(90)]),
      targetRole: z.string().min(1).max(120),
      targetSalaryLpa: z.number().min(1).max(300),
      yearsOfExperience: z.number().min(0).max(50),
      dailyStudyHours: z.number().min(0.5).max(16),
      weakSkills: z.array(z.object({ name: z.string(), score: z.number() })).max(20),
      strongSkills: z.array(z.object({ name: z.string(), score: z.number() })).max(20),
      jdMissingSkills: z.array(z.string()).max(20),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid roadmap parameters.' });
    }
    try {
      const result = await generatePersonalizedRoadmap(parsed.data);
      return res.json(result);
    } catch (err) {
      console.error('Roadmap generation error:', err);
      return res.status(502).json({ error: err instanceof Error ? err.message : 'AI roadmap generation failed.' });
    }
  });

  app.post('/api/ai/planner/evaluate', requireAuth, aiRateLimiter, async (req: AuthRequest, res) => {
    const schema = z.object({
      topicTitle: z.string().min(1).max(180),
      category: z.string().min(1).max(80),
      practiceQuestion: z.string().min(1).max(2000),
      userAnswer: z.string().min(1).max(6000),
      targetRole: z.string().min(1).max(120),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please write an answer before submitting.' });
    }
    try {
      const result = await evaluateDailyTaskAnswer(parsed.data);
      return res.json(result);
    } catch (err) {
      console.error('Planner evaluation error:', err);
      return res.status(502).json({ error: err instanceof Error ? err.message : 'AI feedback unavailable.' });
    }
  });

  app.post('/api/ai/tutor/chat', requireAuth, aiRateLimiter, async (req: AuthRequest, res) => {
    const schema = z.object({
      topic: z.string().min(1).max(180),
      level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
      roadmapPhase: z.string().max(160),
      targetRole: z.string().min(1).max(120),
      preferredLanguage: z.string().max(40),
      history: z.array(z.object({ role: z.string(), content: z.string() })).max(20),
      userMessage: z.string().min(1).max(3000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid tutor request.' });
    }
    try {
      const result = await runAiTutorTurn(parsed.data);
      return res.json(result);
    } catch (err) {
      console.error('Tutor error:', err);
      return res.status(502).json({ error: err instanceof Error ? err.message : 'AI Tutor unavailable.' });
    }
  });

  app.post('/api/ai/job/analyze', requireAuth, aiRateLimiter, async (req: AuthRequest, res) => {
    const schema = z.object({
      company: z.string().max(120),
      rawDescription: z.string().min(30).max(12000),
      userSkills: z.array(z.object({ name: z.string(), score: z.number() })).max(40),
      yearsOfExperience: z.number().min(0).max(50),
      targetSalaryLpa: z.number().min(1).max(300),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please paste a job description (minimum 30 characters).' });
    }
    try {
      const result = await analyzeJobDescription(parsed.data);
      return res.json(result);
    } catch (err) {
      console.error('JD analyzer error:', err);
      return res.status(502).json({ error: err instanceof Error ? err.message : 'Job analysis failed.' });
    }
  });

  app.post('/api/ai/interview/generate', requireAuth, aiRateLimiter, async (req: AuthRequest, res) => {
    const schema = z.object({
      track: z.string().min(1).max(60),
      difficulty: z.string().min(1).max(60),
      targetRole: z.string().min(1).max(120),
      targetSalaryLpa: z.number().min(1).max(300),
      weakAreas: z.array(z.string()).max(15),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid mock interview configuration.' });
    }
    try {
      const result = await generateMockInterviewQuestions(parsed.data);
      return res.json(result);
    } catch (err) {
      console.error('Mock interview generate error:', err);
      return res.status(502).json({ error: err instanceof Error ? err.message : 'Failed to generate interview questions.' });
    }
  });

  app.post('/api/ai/interview/evaluate', requireAuth, aiRateLimiter, async (req: AuthRequest, res) => {
    const schema = z.object({
      track: z.string().min(1).max(60),
      difficulty: z.string().min(1).max(60),
      targetRole: z.string().min(1).max(120),
      qaItems: z
        .array(
          z.object({
            id: z.string(),
            category: z.string(),
            question: z.string(),
            userAnswer: z.string().max(6000),
          })
        )
        .min(1)
        .max(10),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid interview answers payload.' });
    }
    try {
      const result = await evaluateMockInterview(parsed.data);
      return res.json(result);
    } catch (err) {
      console.error('Mock interview evaluate error:', err);
      return res.status(502).json({ error: err instanceof Error ? err.message : 'Failed to evaluate interview.' });
    }
  });

  app.post('/api/ai/coding/evaluate', requireAuth, aiRateLimiter, async (req: AuthRequest, res) => {
    const schema = z.object({
      problemTitle: z.string().min(1).max(180),
      statement: z.string().min(1).max(4000),
      expectedConcepts: z.array(z.string()).max(15),
      code: z.string().min(10).max(16000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please write your Java solution before submitting.' });
    }
    try {
      const result = await evaluateCodingSolution(parsed.data);
      return res.json(result);
    } catch (err) {
      console.error('Coding evaluation error:', err);
      return res.status(502).json({ error: err instanceof Error ? err.message : 'Code evaluation unavailable.' });
    }
  });

  app.post('/api/ai/projects/recommend', requireAuth, aiRateLimiter, async (req: AuthRequest, res) => {
    const schema = z.object({
      targetRole: z.string().min(1).max(120),
      targetSalaryLpa: z.number().min(1).max(300),
      focusSkill: z.string().max(120),
      difficulty: z.string().min(1).max(60),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid project recommendation request.' });
    }
    try {
      const result = await generatePortfolioProject(parsed.data);
      return res.json(result);
    } catch (err) {
      console.error('Project recommendation error:', err);
      return res.status(502).json({ error: err instanceof Error ? err.message : 'Project recommendation unavailable.' });
    }
  });

  // Vite middleware in development, static assets in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AabPrepKarro AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
