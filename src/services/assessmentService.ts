import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  COMPANY_OPTIONS,
  DEFAULT_DAILY_ASSESSMENT,
  getTodayIsoDate,
  type CandidateSubmissionInput,
  type CandidateSubmissionRecord,
  type DailyAssessmentConfig,
  type McqQuestion,
} from '../types/assessment';

const ASSESSMENT_COLLECTION = 'dailyAssessments';
const CURRENT_ASSESSMENT_ID = 'current';
const SUBMISSIONS_COLLECTION = 'candidateSubmissions';
const LOCKS_COLLECTION = 'submissionLocks';

export interface LocalSubmissionReceipt {
  assessmentDate: string;
  fullName: string;
  company: string;
  track: string;
  totalScore: number;
  mcqScore: number;
  iqScore: number;
}

const LOCAL_LOCK_PREFIX = 'hendry_soulveyra_submitted_';

export function getLocalSubmissionReceipt(
  assessmentDate: string
): LocalSubmissionReceipt | null {
  try {
    const raw = window.localStorage.getItem(`${LOCAL_LOCK_PREFIX}${assessmentDate}`);
    if (!raw) return null;
    return JSON.parse(raw) as LocalSubmissionReceipt;
  } catch {
    return null;
  }
}

export function saveLocalSubmissionReceipt(receipt: LocalSubmissionReceipt): void {
  try {
    window.localStorage.setItem(
      `${LOCAL_LOCK_PREFIX}${receipt.assessmentDate}`,
      JSON.stringify(receipt)
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function clearLocalSubmissionReceipt(assessmentDate: string): void {
  try {
    window.localStorage.removeItem(`${LOCAL_LOCK_PREFIX}${assessmentDate}`);
  } catch {
    // Ignore storage errors
  }
}

function clampString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function sha256Prefix(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, 32);
  }
  // Deterministic fallback hash if SubtleCrypto is unavailable
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash).toString(16);
}

export async function buildSubmissionLockIds(
  assessmentDate: string,
  mobile: string,
  email: string
): Promise<{ mobileLockId: string; emailLockId: string }> {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(assessmentDate)
    ? assessmentDate
    : getTodayIsoDate();
  const [mHash, eHash] = await Promise.all([
    sha256Prefix(`m:${safeDate}:${normalizeMobile(mobile)}`),
    sha256Prefix(`e:${safeDate}:${normalizeEmail(email)}`),
  ]);
  return {
    mobileLockId: `lock_m_${safeDate}_${mHash}`,
    emailLockId: `lock_e_${safeDate}_${eHash}`,
  };
}

export async function checkDuplicateSubmission(
  assessmentDate: string,
  mobile: string,
  email: string
): Promise<boolean> {
  const { mobileLockId, emailLockId } = await buildSubmissionLockIds(
    assessmentDate,
    mobile,
    email
  );
  try {
    const [mSnap, eSnap] = await Promise.all([
      getDoc(doc(db, LOCKS_COLLECTION, mobileLockId)),
      getDoc(doc(db, LOCKS_COLLECTION, emailLockId)),
    ]);
    return mSnap.exists() || eSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${LOCKS_COLLECTION}/${mobileLockId}`);
  }
}

export async function fetchDailyAssessment(): Promise<DailyAssessmentConfig> {
  const path = `${ASSESSMENT_COLLECTION}/${CURRENT_ASSESSMENT_ID}`;
  try {
    const snap = await getDoc(doc(db, ASSESSMENT_COLLECTION, CURRENT_ASSESSMENT_ID));
    if (!snap.exists()) {
      return {
        ...DEFAULT_DAILY_ASSESSMENT,
        activeDate: getTodayIsoDate(),
      };
    }

    const data = snap.data() as Partial<DailyAssessmentConfig>;
    if (!Array.isArray(data.questions) || data.questions.length !== 4) {
      return {
        ...DEFAULT_DAILY_ASSESSMENT,
        activeDate: getTodayIsoDate(),
      };
    }

    return {
      activeDate: data.activeDate || getTodayIsoDate(),
      welcomeTitle: data.welcomeTitle || DEFAULT_DAILY_ASSESSMENT.welcomeTitle,
      tagline: data.tagline || DEFAULT_DAILY_ASSESSMENT.tagline,
      channelUrl: data.channelUrl || DEFAULT_DAILY_ASSESSMENT.channelUrl,
      youtubeShortsUrl: data.youtubeShortsUrl || DEFAULT_DAILY_ASSESSMENT.youtubeShortsUrl,
      iqPromptIntro: data.iqPromptIntro || DEFAULT_DAILY_ASSESSMENT.iqPromptIntro,
      iqPrompts:
        Array.isArray(data.iqPrompts) && data.iqPrompts.length > 0
          ? data.iqPrompts
          : DEFAULT_DAILY_ASSESSMENT.iqPrompts,
      questions: data.questions as [McqQuestion, McqQuestion, McqQuestion, McqQuestion],
      updatedBy: data.updatedBy,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveDailyAssessment(
  config: DailyAssessmentConfig,
  adminUid: string
): Promise<void> {
  const path = `${ASSESSMENT_COLLECTION}/${CURRENT_ASSESSMENT_ID}`;

  const sanitizedQuestions = config.questions.map((q, idx) => ({
    id: clampString(q.id || `q${idx + 1}`, 40),
    prompt: clampString(q.prompt, 300),
    options: [
      clampString(q.options[0], 200),
      clampString(q.options[1], 200),
      clampString(q.options[2], 200),
      clampString(q.options[3], 200),
    ] as [string, string, string, string],
    correctIndex: ([0, 1, 2, 3].includes(q.correctIndex) ? q.correctIndex : 0) as 0 | 1 | 2 | 3,
  })) as [McqQuestion, McqQuestion, McqQuestion, McqQuestion];

  const sanitizedPrompts = config.iqPrompts
    .map((p) => clampString(p, 240))
    .filter((p) => p.length >= 5)
    .slice(0, 8);

  const payload = {
    activeDate: /^\d{4}-\d{2}-\d{2}$/.test(config.activeDate)
      ? config.activeDate
      : getTodayIsoDate(),
    welcomeTitle: clampString(config.welcomeTitle || DEFAULT_DAILY_ASSESSMENT.welcomeTitle, 100),
    tagline: clampString(config.tagline || DEFAULT_DAILY_ASSESSMENT.tagline, 100),
    channelUrl: clampString(config.channelUrl || DEFAULT_DAILY_ASSESSMENT.channelUrl, 300),
    youtubeShortsUrl: clampString(
      config.youtubeShortsUrl || DEFAULT_DAILY_ASSESSMENT.youtubeShortsUrl,
      300
    ),
    iqPromptIntro: clampString(config.iqPromptIntro || DEFAULT_DAILY_ASSESSMENT.iqPromptIntro, 500),
    iqPrompts: sanitizedPrompts.length > 0 ? sanitizedPrompts : DEFAULT_DAILY_ASSESSMENT.iqPrompts,
    questions: sanitizedQuestions,
    updatedBy: clampString(adminUid, 128),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, ASSESSMENT_COLLECTION, CURRENT_ASSESSMENT_ID), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function submitCandidateAssessment(
  input: CandidateSubmissionInput
): Promise<string> {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const submissionId = `sub_${Date.now()}_${randomSuffix}`;
  const path = `${SUBMISSIONS_COLLECTION}/${submissionId}`;

  const safeCompany = COMPANY_OPTIONS.includes(input.company) ? input.company : 'Firstsource';
  const safeMcqScore = [0, 2, 4, 6, 8].includes(input.mcqScore) ? input.mcqScore : 0;
  const safeIqScore = input.iqScore === 2 ? 2 : 0;
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(input.assessmentDate)
    ? input.assessmentDate
    : getTodayIsoDate();

  const payload = {
    track: input.track === 'Experienced' ? 'Experienced' : 'Fresher',
    fullName: clampString(input.fullName, 80),
    mobile: clampString(input.mobile, 20),
    email: clampString(input.email, 120),
    company: safeCompany,
    experienceYears: clampString(input.experienceYears || '', 30),
    mcqAnswers: input.mcqAnswers.map((a) => (a >= 0 && a <= 3 ? a : 0)),
    mcqScore: safeMcqScore,
    iqQuestion: clampString(input.iqQuestion, 240),
    iqResponse: clampString(input.iqResponse, 1000),
    iqScore: safeIqScore,
    totalScore: safeMcqScore + safeIqScore,
    subscribedConfirmed: Boolean(input.subscribedConfirmed),
    assessmentDate: safeDate,
    createdAt: serverTimestamp(),
  };

  const { mobileLockId, emailLockId } = await buildSubmissionLockIds(
    safeDate,
    input.mobile,
    input.email
  );

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, SUBMISSIONS_COLLECTION, submissionId), payload);
    batch.set(doc(db, LOCKS_COLLECTION, mobileLockId), {
      assessmentDate: safeDate,
      submitted: true,
      createdAt: serverTimestamp(),
    });
    if (emailLockId !== mobileLockId) {
      batch.set(doc(db, LOCKS_COLLECTION, emailLockId), {
        assessmentDate: safeDate,
        submitted: true,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();

    saveLocalSubmissionReceipt({
      assessmentDate: safeDate,
      fullName: payload.fullName,
      company: payload.company,
      track: payload.track,
      totalScore: payload.totalScore,
      mcqScore: payload.mcqScore,
      iqScore: payload.iqScore,
    });

    return submissionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeCandidateSubmissions(
  onData: (items: CandidateSubmissionRecord[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(150)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: CandidateSubmissionRecord[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<CandidateSubmissionRecord, 'id'>;
        return {
          id: d.id,
          ...data,
        };
      });
      onData(records);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, SUBMISSIONS_COLLECTION);
    }
  );
}

export async function updateCandidateIqScore(
  submissionId: string,
  iqScore: 0 | 2,
  mcqScore: number
): Promise<void> {
  const path = `${SUBMISSIONS_COLLECTION}/${submissionId}`;
  try {
    await updateDoc(doc(db, SUBMISSIONS_COLLECTION, submissionId), {
      iqScore,
      totalScore: mcqScore + iqScore,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCandidateSubmission(
  submission: CandidateSubmissionRecord
): Promise<void> {
  const path = `${SUBMISSIONS_COLLECTION}/${submission.id}`;
  try {
    const { mobileLockId, emailLockId } = await buildSubmissionLockIds(
      submission.assessmentDate,
      submission.mobile,
      submission.email
    );
    const batch = writeBatch(db);
    batch.delete(doc(db, SUBMISSIONS_COLLECTION, submission.id));
    batch.delete(doc(db, LOCKS_COLLECTION, mobileLockId));
    if (emailLockId !== mobileLockId) {
      batch.delete(doc(db, LOCKS_COLLECTION, emailLockId));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
