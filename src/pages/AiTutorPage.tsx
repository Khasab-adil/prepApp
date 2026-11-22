import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Send } from 'lucide-react';
import { useCareerData } from '../hooks/useCareerData.ts';
import { callAiApi } from '../lib/apiClient.ts';
import { createTutorThread, logStudyActivity, updateTutorThread } from '../lib/firestoreRepo.ts';
import { getTodayIsoDate } from '../lib/readiness.ts';
import { ExplanationLevel, TutorMessage, TutorThread } from '../types/career.ts';
import { ErrorBanner, LoadingRows } from '../components/DataState.tsx';

export function AiTutorPage() {
  const location = useLocation();
  const routeState = location.state as { topic?: string; phase?: string } | null;

  const { uid, profile, activeRoadmap, tutorThreads, isLoading, invalidate } = useCareerData();

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [topicInput, setTopicInput] = useState(routeState?.topic || 'Spring Boot Dependency Injection & Bean Lifecycle');
  const [level, setLevel] = useState<ExplanationLevel>('Intermediate');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedThreadId && tutorThreads.length > 0 && !routeState?.topic) {
      setSelectedThreadId(tutorThreads[0].id);
    }
  }, [tutorThreads, selectedThreadId, routeState]);

  if (isLoading) {
    return <LoadingRows rows={6} />;
  }

  const activeThread: TutorThread | null =
    tutorThreads.find((t) => t.id === selectedThreadId) || null;

  const currentPhaseTitle =
    routeState?.phase ||
    activeRoadmap?.phases.find((p) => p.topics.some((t) => t.status !== 'completed'))?.title ||
    'Java Backend Foundations';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !profile) return;
    const text = messageInput.trim();
    if (!text) return;

    setSending(true);
    setErrorMsg(null);

    try {
      const targetTopic = activeThread ? activeThread.topic : topicInput.trim() || 'Core Java';
      const targetPhase = activeThread ? activeThread.roadmapPhase : currentPhaseTitle;
      const history = (activeThread?.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, tokensUsed } = await callAiApi<{
        explanation: string;
        realWorldExample: string;
        codeSnippet: string;
        lineByLineBreakdown: string[];
        followUpQuestion: string;
        knowledgeGapNote: string;
      }>('/api/ai/tutor/chat', {
        topic: targetTopic,
        level,
        roadmapPhase: targetPhase,
        targetRole: profile.targetRole,
        preferredLanguage: profile.preferredLanguage,
        history,
        userMessage: text,
      });

      const nowIso = new Date().toISOString();
      const userMsg: TutorMessage = {
        role: 'user',
        content: text,
        timestamp: nowIso,
      };
      const assistantMsg: TutorMessage = {
        role: 'assistant',
        content: `${data.explanation}\n\nReal-world example: ${data.realWorldExample}${
          data.knowledgeGapNote ? `\n\nGap check: ${data.knowledgeGapNote}` : ''
        }`,
        codeSnippet: data.codeSnippet,
        lineByLineExplanation: data.lineByLineBreakdown,
        followUpQuestion: data.followUpQuestion,
        timestamp: nowIso,
      };

      const nextMessages = [...(activeThread?.messages || []), userMsg, assistantMsg].slice(-100);

      if (activeThread) {
        await updateTutorThread(uid, activeThread.id, {
          level,
          messages: nextMessages,
        });
      } else {
        const newId = await createTutorThread(uid, {
          topic: targetTopic,
          level,
          roadmapPhase: targetPhase,
          messages: nextMessages,
        });
        setSelectedThreadId(newId);
      }

      await logStudyActivity(uid, {
        date: getTodayIsoDate(),
        minutesStudied: 10,
        tasksCompleted: 0,
        aiTokensUsed: tokensUsed,
        actionType: 'tutor_session',
        note: `AI Tutor: ${targetTopic} (${level})`,
      });

      setMessageInput('');
      invalidate('tutorThreads');
      invalidate('activityLogs');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI Tutor request failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Contextual AI Tutor
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Connected to your active roadmap ({currentPhaseTitle}) · Switch depth between Beginner, Intermediate, and Advanced.
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {(['Beginner', 'Intermediate', 'Advanced'] as ExplanationLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevel(lvl)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                level === lvl
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Saved Topic Threads */}
        <aside className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Study Threads
            </h3>
            <button
              type="button"
              onClick={() => setSelectedThreadId(null)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              New Topic
            </button>
          </div>

          <div className="mt-3 space-y-1.5">
            {tutorThreads.length === 0 ? (
              <p className="py-4 text-xs text-slate-500 dark:text-slate-400">
                Ask a question on the right to start your first saved study thread.
              </p>
            ) : (
              tutorThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => {
                    setSelectedThreadId(thread.id);
                    setLevel(thread.level);
                  }}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                    activeThread?.id === thread.id
                      ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <p className="truncate text-sm font-medium">{thread.topic}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {thread.level} · {thread.messages.length} msgs
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Active Conversation Panel */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8 dark:border-slate-800 dark:bg-slate-900">
          {!activeThread && (
            <div className="mb-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Topic to Explore
              </label>
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g., Spring Data JPA N+1 Query Problem"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          )}

          <div className="flex-1 space-y-5 overflow-y-auto py-2" style={{ maxHeight: '520px' }}>
            {!activeThread || activeThread.messages.length === 0 ? (
              <div className="py-8 text-sm text-slate-500 dark:text-slate-400">
                Ask for an explanation, a Java code walkthrough, or try answering a concept check at the{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{level}</span> level.
              </div>
            ) : (
              activeThread.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-4 ${
                    msg.role === 'user'
                      ? 'border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/30'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {msg.role === 'user' ? 'You' : `AabPrepKarro Tutor (${activeThread.level})`}
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    {msg.content}
                  </p>

                  {msg.codeSnippet && (
                    <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3.5 font-mono text-xs text-slate-100">
                      <code>{msg.codeSnippet}</code>
                    </pre>
                  )}

                  {msg.lineByLineExplanation && msg.lineByLineExplanation.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Line-by-Line Walkthrough
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-400">
                        {msg.lineByLineExplanation.map((line, lIdx) => (
                          <li key={lIdx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {msg.followUpQuestion && (
                    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                        Check Your Understanding
                      </p>
                      <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                        {msg.followUpQuestion}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="mt-4 flex gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Ask a question, request a code example, or answer the follow-up..."
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
            >
              <Send className="h-4 w-4" />
              <span>{sending ? 'Thinking...' : 'Send'}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
