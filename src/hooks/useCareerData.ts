import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.tsx';
import {
  fetchActivityLogs,
  fetchAssessments,
  fetchCodingSubmissions,
  fetchDailyTasks,
  fetchJobAnalyses,
  fetchMockInterviews,
  fetchPortfolioProjects,
  fetchRoadmaps,
  fetchTutorThreads,
  fetchUserProfile,
  fetchUserSkills,
} from '../lib/firestoreRepo.ts';
import { calculateReadiness, calculateStreak } from '../lib/readiness.ts';

export function useCareerData() {
  const { user, workspaceReady } = useAuth();
  const uid = user?.uid ?? '';
  const enabled = Boolean(uid && workspaceReady);
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', uid],
    queryFn: () => fetchUserProfile(uid),
    enabled,
  });

  const skillsQuery = useQuery({
    queryKey: ['skills', uid],
    queryFn: () => fetchUserSkills(uid),
    enabled,
  });

  const assessmentsQuery = useQuery({
    queryKey: ['assessments', uid],
    queryFn: () => fetchAssessments(uid),
    enabled,
  });

  const roadmapsQuery = useQuery({
    queryKey: ['roadmaps', uid],
    queryFn: () => fetchRoadmaps(uid),
    enabled,
  });

  const dailyTasksQuery = useQuery({
    queryKey: ['dailyTasks', uid],
    queryFn: () => fetchDailyTasks(uid),
    enabled,
  });

  const tutorThreadsQuery = useQuery({
    queryKey: ['tutorThreads', uid],
    queryFn: () => fetchTutorThreads(uid),
    enabled,
  });

  const jobAnalysesQuery = useQuery({
    queryKey: ['jobAnalyses', uid],
    queryFn: () => fetchJobAnalyses(uid),
    enabled,
  });

  const mockInterviewsQuery = useQuery({
    queryKey: ['mockInterviews', uid],
    queryFn: () => fetchMockInterviews(uid),
    enabled,
  });

  const codingSubmissionsQuery = useQuery({
    queryKey: ['codingSubmissions', uid],
    queryFn: () => fetchCodingSubmissions(uid),
    enabled,
  });

  const projectsQuery = useQuery({
    queryKey: ['projects', uid],
    queryFn: () => fetchPortfolioProjects(uid),
    enabled,
  });

  const activityLogsQuery = useQuery({
    queryKey: ['activityLogs', uid],
    queryFn: () => fetchActivityLogs(uid),
    enabled,
  });

  const skills = skillsQuery.data ?? [];
  const assessments = assessmentsQuery.data ?? [];
  const roadmaps = roadmapsQuery.data ?? [];
  const activeRoadmap = roadmaps.find((r) => r.isActive) ?? roadmaps[0] ?? null;
  const dailyTasks = dailyTasksQuery.data ?? [];
  const tutorThreads = tutorThreadsQuery.data ?? [];
  const jobAnalyses = jobAnalysesQuery.data ?? [];
  const mockInterviews = mockInterviewsQuery.data ?? [];
  const codingSubmissions = codingSubmissionsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const activityLogs = activityLogsQuery.data ?? [];

  const readiness = calculateReadiness({
    skills,
    assessments,
    activeRoadmap,
    interviews: mockInterviews,
    submissions: codingSubmissions,
    projects,
  });

  const streakStats = calculateStreak(activityLogs);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['profile', uid] });
    queryClient.invalidateQueries({ queryKey: ['skills', uid] });
    queryClient.invalidateQueries({ queryKey: ['assessments', uid] });
    queryClient.invalidateQueries({ queryKey: ['roadmaps', uid] });
    queryClient.invalidateQueries({ queryKey: ['dailyTasks', uid] });
    queryClient.invalidateQueries({ queryKey: ['tutorThreads', uid] });
    queryClient.invalidateQueries({ queryKey: ['jobAnalyses', uid] });
    queryClient.invalidateQueries({ queryKey: ['mockInterviews', uid] });
    queryClient.invalidateQueries({ queryKey: ['codingSubmissions', uid] });
    queryClient.invalidateQueries({ queryKey: ['projects', uid] });
    queryClient.invalidateQueries({ queryKey: ['activityLogs', uid] });
  };

  return {
    uid,
    profile: profileQuery.data ?? null,
    skills,
    assessments,
    roadmaps,
    activeRoadmap,
    dailyTasks,
    tutorThreads,
    jobAnalyses,
    mockInterviews,
    codingSubmissions,
    projects,
    activityLogs,
    readiness,
    streakStats,
    isLoading:
      profileQuery.isLoading ||
      skillsQuery.isLoading ||
      roadmapsQuery.isLoading ||
      dailyTasksQuery.isLoading,
    invalidate: (key: string) => queryClient.invalidateQueries({ queryKey: [key, uid] }),
    invalidateAll,
  };
}
