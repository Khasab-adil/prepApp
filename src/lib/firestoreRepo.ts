import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  buildSeedDailyTasks,
  buildSeedPortfolioProject,
  mapSeedSkillsToRecords,
} from '../data/seedCurriculum.ts';
import {
  ActivityLog,
  Assessment,
  CodingSubmission,
  DailyTask,
  JobAnalysis,
  MockInterview,
  PortfolioProject,
  Roadmap,
  TutorThread,
  UserProfile,
  UserSkill,
} from '../types/career.ts';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import { getTodayIsoDate } from './readiness.ts';

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export async function bootstrapNewUserWorkspace(user: User): Promise<void> {
  const uid = user.uid;
  const userRef = doc(db, 'users', uid);
  const profileRef = doc(db, 'users', uid, 'profile', 'main');

  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid,
        email: user.email || '',
        displayName: user.displayName || 'Developer',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      const batch = writeBatch(db);
      batch.set(profileRef, {
        uid,
        fullName: user.displayName || 'Java Developer',
        email: user.email || '',
        currentEducation: 'B.Tech / B.E. in Computer Science',
        currentRole: 'Software Developer',
        yearsOfExperience: 1,
        currentSkills: ['Core Java', 'OOP', 'SQL', 'Git', 'REST APIs'],
        targetRole: 'Java Backend Developer',
        targetSalaryLpa: 9,
        dailyStudyHours: 2,
        preferredLanguage: 'English',
        targetLocation: 'Bengaluru, India',
        jobSearchTimeline: '90 days',
        onboardingCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const seedSkills = mapSeedSkillsToRecords(uid);
      for (const s of seedSkills) {
        const skillRef = doc(db, 'users', uid, 'skills', s.id);
        batch.set(skillRef, {
          uid: s.uid,
          name: s.name,
          category: s.category,
          score: s.score,
          targetScore: s.targetScore,
          basis: s.basis,
          source: s.source,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const today = getTodayIsoDate();
      const seedTasks = buildSeedDailyTasks(uid, today);
      seedTasks.forEach((t, idx) => {
        const taskRef = doc(db, 'users', uid, 'dailyTasks', `seed_${today}_${idx + 1}`);
        batch.set(taskRef, {
          ...t,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      const seedProject = buildSeedPortfolioProject(uid);
      const projRef = doc(db, 'users', uid, 'projects', 'seed_ledgerflow');
      batch.set(projRef, {
        ...seedProject,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

// Profile
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}/profile/main`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'profile', 'main'));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const path = `users/${uid}/profile/main`;
  try {
    await updateDoc(doc(db, 'users', uid, 'profile', 'main'), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Skills
export async function fetchUserSkills(uid: string): Promise<UserSkill[]> {
  const path = `users/${uid}/skills`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'skills'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserSkill, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function upsertUserSkill(
  uid: string,
  skill: Omit<UserSkill, 'uid' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const path = `users/${uid}/skills/${skill.id}`;
  try {
    const ref = doc(db, 'users', uid, 'skills', skill.id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        name: skill.name,
        category: skill.category,
        score: skill.score,
        targetScore: skill.targetScore,
        basis: skill.basis,
        source: skill.source,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid,
        name: skill.name,
        category: skill.category,
        score: skill.score,
        targetScore: skill.targetScore,
        basis: skill.basis,
        source: skill.source,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Assessments
export async function fetchAssessments(uid: string): Promise<Assessment[]> {
  const path = `users/${uid}/assessments`;
  try {
    const q = query(collection(db, 'users', uid, 'assessments'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Assessment, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createAssessmentRecord(
  uid: string,
  payload: Omit<Assessment, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId('asm');
  const path = `users/${uid}/assessments/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'assessments', id), {
      uid,
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function completeAssessmentRecord(
  uid: string,
  assessmentId: string,
  updates: Pick<
    Assessment,
    'status' | 'overallScore' | 'scoreBasis' | 'strongAreas' | 'weakAreas' | 'summaryFeedback' | 'questions'
  >
): Promise<void> {
  const path = `users/${uid}/assessments/${assessmentId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'assessments', assessmentId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Roadmaps
export async function fetchRoadmaps(uid: string): Promise<Roadmap[]> {
  const path = `users/${uid}/roadmaps`;
  try {
    const q = query(collection(db, 'users', uid, 'roadmaps'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Roadmap, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createRoadmapRecord(
  uid: string,
  payload: Omit<Roadmap, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId('rm');
  const path = `users/${uid}/roadmaps/${id}`;
  try {
    const existing = await fetchRoadmaps(uid);
    const batch = writeBatch(db);
    for (const rm of existing) {
      if (rm.isActive) {
        batch.update(doc(db, 'users', uid, 'roadmaps', rm.id), {
          isActive: false,
          updatedAt: serverTimestamp(),
        });
      }
    }
    batch.set(doc(db, 'users', uid, 'roadmaps', id), {
      uid,
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateRoadmapPhases(
  uid: string,
  roadmapId: string,
  phases: Roadmap['phases']
): Promise<void> {
  const path = `users/${uid}/roadmaps/${roadmapId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'roadmaps', roadmapId), {
      phases,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function setActiveRoadmap(uid: string, targetId: string, allRoadmaps: Roadmap[]): Promise<void> {
  const path = `users/${uid}/roadmaps/${targetId}`;
  try {
    const batch = writeBatch(db);
    for (const rm of allRoadmaps) {
      batch.update(doc(db, 'users', uid, 'roadmaps', rm.id), {
        isActive: rm.id === targetId,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Daily Tasks
export async function fetchDailyTasks(uid: string): Promise<DailyTask[]> {
  const path = `users/${uid}/dailyTasks`;
  try {
    const q = query(collection(db, 'users', uid, 'dailyTasks'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DailyTask, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createDailyTask(
  uid: string,
  task: Omit<DailyTask, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId('task');
  const path = `users/${uid}/dailyTasks/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'dailyTasks', id), {
      uid,
      ...task,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateDailyTask(
  uid: string,
  taskId: string,
  updates: Partial<
    Pick<DailyTask, 'durationMinutes' | 'userAnswer' | 'aiFeedback' | 'score' | 'status' | 'completedDate'>
  >
): Promise<void> {
  const path = `users/${uid}/dailyTasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'dailyTasks', taskId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Tutor Threads
export async function fetchTutorThreads(uid: string): Promise<TutorThread[]> {
  const path = `users/${uid}/tutorThreads`;
  try {
    const q = query(collection(db, 'users', uid, 'tutorThreads'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TutorThread, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createTutorThread(
  uid: string,
  thread: Omit<TutorThread, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId('tut');
  const path = `users/${uid}/tutorThreads/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'tutorThreads', id), {
      uid,
      ...thread,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateTutorThread(
  uid: string,
  threadId: string,
  updates: Pick<TutorThread, 'level' | 'messages'>
): Promise<void> {
  const path = `users/${uid}/tutorThreads/${threadId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'tutorThreads', threadId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Job Analyses
export async function fetchJobAnalyses(uid: string): Promise<JobAnalysis[]> {
  const path = `users/${uid}/jobAnalyses`;
  try {
    const q = query(collection(db, 'users', uid, 'jobAnalyses'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobAnalysis, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createJobAnalysis(
  uid: string,
  analysis: Omit<JobAnalysis, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId('jd');
  const path = `users/${uid}/jobAnalyses/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'jobAnalyses', id), {
      uid,
      ...analysis,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteJobAnalysis(uid: string, id: string): Promise<void> {
  const path = `users/${uid}/jobAnalyses/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'jobAnalyses', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Mock Interviews
export async function fetchMockInterviews(uid: string): Promise<MockInterview[]> {
  const path = `users/${uid}/mockInterviews`;
  try {
    const q = query(collection(db, 'users', uid, 'mockInterviews'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MockInterview, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createMockInterview(
  uid: string,
  interview: Omit<MockInterview, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId('int');
  const path = `users/${uid}/mockInterviews/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'mockInterviews', id), {
      uid,
      ...interview,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function completeMockInterview(
  uid: string,
  interviewId: string,
  updates: Pick<MockInterview, 'status' | 'overallScore' | 'recurringWeaknesses' | 'improvementPlan' | 'qaItems'>
): Promise<void> {
  const path = `users/${uid}/mockInterviews/${interviewId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'mockInterviews', interviewId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Coding Submissions
export async function fetchCodingSubmissions(uid: string): Promise<CodingSubmission[]> {
  const path = `users/${uid}/codingSubmissions`;
  try {
    const q = query(collection(db, 'users', uid, 'codingSubmissions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CodingSubmission, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createCodingSubmission(
  uid: string,
  submission: Omit<CodingSubmission, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId('code');
  const path = `users/${uid}/codingSubmissions/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'codingSubmissions', id), {
      uid,
      ...submission,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// Portfolio Projects
export async function fetchPortfolioProjects(uid: string): Promise<PortfolioProject[]> {
  const path = `users/${uid}/projects`;
  try {
    const q = query(collection(db, 'users', uid, 'projects'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PortfolioProject, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createPortfolioProject(
  uid: string,
  project: Omit<PortfolioProject, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId('proj');
  const path = `users/${uid}/projects/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'projects', id), {
      uid,
      ...project,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updatePortfolioProjectChecklists(
  uid: string,
  projectId: string,
  updates: Pick<PortfolioProject, 'milestones' | 'testingChecklist' | 'deploymentChecklist'>
): Promise<void> {
  const path = `users/${uid}/projects/${projectId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'projects', projectId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Activity Logs & Token Usage
export async function fetchActivityLogs(uid: string): Promise<ActivityLog[]> {
  const path = `users/${uid}/activityLogs`;
  try {
    const q = query(collection(db, 'users', uid, 'activityLogs'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityLog, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function logStudyActivity(
  uid: string,
  entry: Omit<ActivityLog, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId('log');
  const path = `users/${uid}/activityLogs/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'activityLogs', id), {
      uid,
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}
