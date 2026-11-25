export type CandidateTrack = 'Fresher' | 'Experienced';

export const COMPANY_OPTIONS = [
  'Firstsource',
  'Star Health Insurance',
  'Frankfinn',
  'Altruist',
] as const;

export type CompanyOption = (typeof COMPANY_OPTIONS)[number];

export interface McqQuestion {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export interface DailyAssessmentConfig {
  activeDate: string;
  welcomeTitle: string;
  tagline: string;
  channelUrl: string;
  youtubeShortsUrl: string;
  iqPromptIntro: string;
  iqPrompts: string[];
  questions: [McqQuestion, McqQuestion, McqQuestion, McqQuestion];
  updatedBy?: string;
  updatedAt?: unknown;
}

export interface CandidateSubmissionInput {
  track: CandidateTrack;
  fullName: string;
  mobile: string;
  email: string;
  company: CompanyOption;
  experienceYears: string;
  mcqAnswers: [number, number, number, number];
  mcqScore: number;
  iqQuestion: string;
  iqResponse: string;
  iqScore: number;
  totalScore: number;
  subscribedConfirmed: boolean;
  assessmentDate: string;
}

export interface CandidateSubmissionRecord extends CandidateSubmissionInput {
  id: string;
  createdAt?: { toDate?: () => Date } | Date | null;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DEFAULT_DAILY_ASSESSMENT: DailyAssessmentConfig = {
  activeDate: getTodayIsoDate(),
  welcomeTitle: 'Welcome to Hendry_soulveyra',
  tagline: 'Think, Learn, Grow',
  channelUrl: 'https://youtube.com/@hendrysoulveyra?si=0NJ4P-pLv299bNKu',
  youtubeShortsUrl: 'https://youtube.com/@hendrysoulveyra?si=0NJ4P-pLv299bNKu',
  iqPromptIntro:
    'Let me check your IQ level! Watch the full video below — your question will be based on this video. Before continuing, kindly subscribe to the channel, give 1 like, and share your thought in the comment box.',
  iqPrompts: [
    'Tell me the moral of the story — what did you think?',
    'How was this video helpful for you and your upcoming interview?',
    'What key communication lesson from this video will you apply on a customer call?',
    'Summarize the main message of the video in your own words.',
  ],
  questions: [
    {
      id: 'q1',
      prompt: 'What is customer satisfaction?',
      options: [
        'Making customers wait',
        'Ending calls quickly',
        'Understanding customer needs and providing proper solutions',
        'Transferring customers to other agents',
      ],
      correctIndex: 2,
    },
    {
      id: 'q2',
      prompt: 'Which sentence is grammatically correct?',
      options: [
        "She don't know the answer",
        "She doesn't knows the answer",
        "She doesn't know the answer",
        'She not know answer',
      ],
      correctIndex: 2,
    },
    {
      id: 'q3',
      prompt: 'What is the best way to place a customer on hold?',
      options: [
        'Put them on hold without saying anything',
        'Ask for permission and explain the reason',
        'Mute the call for a long time',
        'Disconnect and call later',
      ],
      correctIndex: 1,
    },
    {
      id: 'q4',
      prompt: 'What does teamwork mean?',
      options: [
        'Working alone all the time',
        'Supporting and cooperating with team members to achieve a common goal',
        'Competing with every colleague',
        'Avoiding responsibilities',
      ],
      correctIndex: 1,
    },
  ],
};
