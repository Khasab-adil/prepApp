import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LayoutShell } from './components/LayoutShell.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { RoadmapPage } from './pages/RoadmapPage.tsx';
import { DailyPlannerPage } from './pages/DailyPlannerPage.tsx';
import { AiTutorPage } from './pages/AiTutorPage.tsx';
import { AssessmentPage } from './pages/AssessmentPage.tsx';
import { JobAnalyzerPage } from './pages/JobAnalyzerPage.tsx';
import { MockInterviewPage } from './pages/MockInterviewPage.tsx';
import { CodingPracticePage } from './pages/CodingPracticePage.tsx';
import { ProjectsPage } from './pages/ProjectsPage.tsx';
import { ProgressPage } from './pages/ProgressPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ProtectedAppRoutes() {
  const { user, authLoading, workspaceReady } = useAuth();

  if (authLoading || (user && !workspaceReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        Loading your AabPrepKarro AI workspace...
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <LayoutShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/planner" element={<DailyPlannerPage />} />
        <Route path="/tutor" element={<AiTutorPage />} />
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/job-analyzer" element={<JobAnalyzerPage />} />
        <Route path="/interviews" element={<MockInterviewPage />} />
        <Route path="/coding" element={<CodingPracticePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LayoutShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ProtectedAppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
