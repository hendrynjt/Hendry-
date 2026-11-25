import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  Lock,
  Play,
  ShieldCheck,
  ThumbsUp,
  Youtube,
} from 'lucide-react';
import {
  COMPANY_OPTIONS,
  type CandidateSubmissionInput,
  type CandidateTrack,
  type CompanyOption,
  type DailyAssessmentConfig,
} from '../types/assessment';
import {
  buildSafeExternalYouTubeUrl,
  buildYouTubeEmbedUrl,
  buildYouTubeSubscribeUrl,
  extractYouTubeVideoId,
} from '../utils/youtube';
import {
  checkDuplicateSubmission,
  clearLocalSubmissionReceipt,
  getLocalSubmissionReceipt,
  saveLocalSubmissionReceipt,
  submitCandidateAssessment,
  type LocalSubmissionReceipt,
} from '../services/assessmentService';

interface CandidatePortalProps {
  config: DailyAssessmentConfig;
  loadingConfig: boolean;
  isAdminSignedIn: boolean;
  onOpenHrStudio: () => void;
}

type PortalStep = 'track' | 'profile' | 'mcq' | 'video' | 'result' | 'locked';

const CREST_IMAGE_PATH = '/src/assets/images/royal_crest_emblem_1795608247735.jpg';
const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export const CandidatePortal: React.FC<CandidatePortalProps> = ({
  config,
  loadingConfig,
  isAdminSignedIn,
  onOpenHrStudio,
}) => {
  const [step, setStep] = useState<PortalStep>('track');
  const [lockedReceipt, setLockedReceipt] = useState<LocalSubmissionReceipt | null>(null);

  const [track, setTrack] = useState<CandidateTrack | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState<CompanyOption>('Firstsource');
  const [experienceYears, setExperienceYears] = useState('1–2 Years');
  const [profileError, setProfileError] = useState('');
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const [mcqIndex, setMcqIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Array<number | null>>([null, null, null, null]);

  const [subscribedClicked, setSubscribedClicked] = useState(false);
  const [likedClicked, setLikedClicked] = useState(false);
  const [iqResponse, setIqResponse] = useState('');
  const [iqError, setIqError] = useState('');
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [crestFailed, setCrestFailed] = useState(false);

  const [finalResult, setFinalResult] = useState<{
    mcqScore: number;
    iqScore: number;
    totalScore: number;
    submissionId: string;
  } | null>(null);

  // Check if this device has already submitted for the active assessment date
  useEffect(() => {
    if (loadingConfig) return;
    const existing = getLocalSubmissionReceipt(config.activeDate);
    if (existing) {
      setLockedReceipt(existing);
      setStep('locked');
    } else if (step === 'locked') {
      setLockedReceipt(null);
      setStep('track');
    }
  }, [config.activeDate, loadingConfig]);

  // Pick one random IQ question per session from the daily pool
  const selectedIqQuestion = useMemo(() => {
    const pool =
      config.iqPrompts.length > 0
        ? config.iqPrompts
        : ['Tell me the moral of the story — what did you think?'];
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }, [config.iqPrompts]);

  const subscribeUrl = useMemo(
    () => buildYouTubeSubscribeUrl(config.channelUrl),
    [config.channelUrl]
  );

  const embedUrl = useMemo(
    () => buildYouTubeEmbedUrl(config.youtubeShortsUrl),
    [config.youtubeShortsUrl]
  );

  const youtubeVideoId = useMemo(
    () => extractYouTubeVideoId(config.youtubeShortsUrl),
    [config.youtubeShortsUrl]
  );

  const externalShortUrl = useMemo(
    () => buildSafeExternalYouTubeUrl(config.youtubeShortsUrl, config.channelUrl),
    [config.youtubeShortsUrl, config.channelUrl]
  );

  const handleSelectTrack = (chosen: CandidateTrack) => {
    setTrack(chosen);
    setStep('profile');
  };

  const handleProfileContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanMobile = mobile.trim();
    const cleanEmail = email.trim();

    if (cleanName.length < 2) {
      setProfileError('Please enter your full name.');
      return;
    }
    if (!/^[0-9+\-\s]{8,20}$/.test(cleanMobile)) {
      setProfileError('Please enter a valid mobile number (at least 8 digits).');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    setProfileError('');
    setCheckingDuplicate(true);

    try {
      const alreadySubmitted = await checkDuplicateSubmission(
        config.activeDate,
        cleanMobile,
        cleanEmail
      );
      if (alreadySubmitted) {
        const receipt: LocalSubmissionReceipt = {
          assessmentDate: config.activeDate,
          fullName: cleanName,
          company,
          track: track || 'Fresher',
          totalScore: -1,
          mcqScore: 0,
          iqScore: 0,
        };
        saveLocalSubmissionReceipt(receipt);
        setLockedReceipt(receipt);
        setStep('locked');
        return;
      }
      setStep('mcq');
    } catch {
      setProfileError('Unable to verify your registration right now. Please try again.');
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const handleSelectMcqOption = (optionIdx: number) => {
    setMcqAnswers((prev) => {
      const next = [...prev];
      next[mcqIndex] = optionIdx;
      return next;
    });
  };

  const handleMcqNext = () => {
    if (mcqAnswers[mcqIndex] === null) return;
    if (mcqIndex < 3) {
      setMcqIndex((i) => i + 1);
    } else {
      setStep('video');
    }
  };

  const handleMcqPrev = () => {
    if (mcqIndex > 0) {
      setMcqIndex((i) => i - 1);
    } else {
      setStep('profile');
    }
  };

  const handleCopyForYoutube = () => {
    const trimmed = iqResponse.trim();
    if (!trimmed) return;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(trimmed);
      setCopiedAnswer(true);
      window.setTimeout(() => setCopiedAnswer(false), 3500);
    }
  };

  const handleSubmitFinal = async () => {
    const cleanIq = iqResponse.trim();
    if (cleanIq.length < 5) {
      setIqError('Please write your response based on the video (at least 5 characters).');
      return;
    }

    setIqError('');
    setSubmitError('');
    setSubmitting(true);

    try {
      const alreadySubmitted = await checkDuplicateSubmission(
        config.activeDate,
        mobile.trim(),
        email.trim()
      );
      if (alreadySubmitted) {
        setStep('locked');
        return;
      }

      const finalizedAnswers = mcqAnswers.map((a) => (a === null ? 0 : a)) as [
        number,
        number,
        number,
        number,
      ];

      let mcqScore = 0;
      config.questions.forEach((q, idx) => {
        if (finalizedAnswers[idx] === q.correctIndex) {
          mcqScore += 2;
        }
      });

      const iqScore = 2;
      const totalScore = mcqScore + iqScore;

      const payload: CandidateSubmissionInput = {
        track: track || 'Fresher',
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        company,
        experienceYears: track === 'Experienced' ? experienceYears : 'Fresher',
        mcqAnswers: finalizedAnswers,
        mcqScore,
        iqQuestion: selectedIqQuestion,
        iqResponse: cleanIq,
        iqScore,
        totalScore,
        subscribedConfirmed: subscribedClicked,
        assessmentDate: config.activeDate,
      };

      const submissionId = await submitCandidateAssessment(payload);
      setFinalResult({
        mcqScore,
        iqScore,
        totalScore,
        submissionId,
      });
      setStep('result');
    } catch {
      setSubmitError(
        'Could not save your assessment right now. Please check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = config.questions[mcqIndex];
  const progressStepCount =
    step === 'track'
      ? 0
      : step === 'profile'
        ? 1
        : step === 'mcq'
          ? 2 + mcqIndex
          : step === 'video'
            ? 6
            : 7;

  return (
    <div className="relative w-full min-h-dvh lg:min-h-[760px] lg:h-[820px] lg:max-h-[90dvh] lg:w-[430px] lg:rounded-[32px] lg:border lg:border-[#D4AF37]/40 lg:shadow-[0_24px_90px_rgba(212,175,55,0.12)] overflow-hidden bg-[#080705]/92 backdrop-blur-sm flex flex-col">
      {/* Subtle Royal Gold Aura Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.14),transparent_55%)]"
      />

      {/* Compact Sticky Top Bar */}
      <header className="relative z-20 flex items-center justify-between px-5 py-3.5 border-b border-[#D4AF37]/20 bg-[#050505]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          {!crestFailed ? (
            <img
              src={CREST_IMAGE_PATH}
              alt="Hendry_soulveyra crest"
              referrerPolicy="no-referrer"
              onError={() => setCrestFailed(true)}
              className="h-8 w-8 rounded-lg object-cover border border-[#D4AF37]/45 shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-[#14120C] border border-[#D4AF37]/45 flex items-center justify-center shrink-0">
              <Crown className="h-4 w-4 text-[#D4AF37]" />
            </div>
          )}
          <span className="font-royal text-lg font-semibold tracking-wide text-[#FAF6EB] truncate">
            Hendry_soulveyra
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenHrStudio}
          className="min-h-[40px] px-3 text-xs font-medium text-[#F3D578] hover:text-[#FAF6EB] transition-colors whitespace-nowrap shrink-0"
        >
          HR Studio
        </button>
      </header>

      {/* Hairline Royal Gold Progress Indicator */}
      {step !== 'track' && step !== 'locked' && (
        <div className="relative z-20 h-[2px] w-full bg-[#D4AF37]/15">
          <div
            className="h-full bg-gradient-to-r from-[#B8860B] via-[#F3D578] to-[#D4AF37] transition-all duration-300"
            style={{ width: `${Math.round((progressStepCount / 7) * 100)}%` }}
          />
        </div>
      )}

      {/* Main Scrollable 9:16 Stage */}
      <main className="relative z-10 flex-1 overflow-y-auto px-5 py-6 flex flex-col">
        {loadingConfig ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-12">
            <Crown className="h-7 w-7 text-[#D4AF37] animate-pulse" />
            <p className="text-sm text-[#B7AA8E]">Loading today&apos;s interview assessment...</p>
          </div>
        ) : null}

        {/* LOCKED STATE: ALREADY SUBMITTED */}
        {!loadingConfig && step === 'locked' && (
          <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col justify-center py-6 text-center space-y-6"
          >
            <div className="mx-auto h-16 w-16 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/45 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.18)]">
              <ShieldCheck className="h-8 w-8 text-[#F3D578]" />
            </div>

            <div className="space-y-2.5">
              <p className="text-xs tracking-[0.2em] uppercase text-[#D4AF37] font-medium">
                Application Recorded
              </p>
              <h1
                className="font-royal text-3xl font-semibold text-[#FAF6EB] leading-tight"
                style={{ textWrap: 'balance' }}
              >
                You have already submitted the application
              </h1>
              <p className="text-sm text-[#B7AA8E] leading-relaxed max-w-xs mx-auto">
                For further process, please meet your HR recruiter.
              </p>
            </div>

            {lockedReceipt && lockedReceipt.totalScore >= 0 && (
              <div className="rounded-2xl bg-[#11100C]/95 border border-[#D4AF37]/30 p-5 space-y-2">
                <p className="text-xs text-[#B7AA8E]">
                  {lockedReceipt.fullName} · {lockedReceipt.company}
                </p>
                <div className="font-mono text-4xl font-semibold text-[#F3D578] tabular-nums">
                  {lockedReceipt.totalScore}{' '}
                  <span className="text-xl text-[#8D826B]">/ 10</span>
                </div>
                <p className="text-xs text-[#8D826B] tabular-nums">
                  Submitted on {lockedReceipt.assessmentDate}
                </p>
              </div>
            )}

            <div className="rounded-xl bg-[#11100C]/80 border border-[#D4AF37]/20 p-4 text-xs text-[#B7AA8E] leading-relaxed space-y-3">
              <p>
                Each candidate can submit this daily assessment only once. Show this confirmation screen to your HR recruiter at the desk.
              </p>
              {isAdminSignedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    clearLocalSubmissionReceipt(config.activeDate);
                    setLockedReceipt(null);
                    setStep('track');
                  }}
                  className="w-full min-h-[42px] rounded-xl bg-gradient-to-r from-[#C89B2B] via-[#E8C55A] to-[#D4AF37] text-[#050505] font-semibold text-xs"
                >
                  HR Admin: Clear Device Lock &amp; Test Again
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenHrStudio}
                  className="text-xs font-medium text-[#F3D578] hover:underline"
                >
                  HR Recruiter? Open HR Studio to unlock or manage
                </button>
              )}
            </div>
          </motion.section>
        )}

        {/* STEP 1: FRESHER OR EXPERIENCED */}
        {!loadingConfig && step === 'track' && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col justify-between py-2"
          >
            <div className="text-center space-y-4 pt-3">
              <div className="mx-auto h-20 w-20 rounded-2xl overflow-hidden border border-[#D4AF37]/50 shadow-[0_8px_36px_rgba(212,175,55,0.22)] bg-[#12100B] flex items-center justify-center">
                {!crestFailed ? (
                  <img
                    src={CREST_IMAGE_PATH}
                    alt="Hendry_soulveyra Royal Emblem"
                    referrerPolicy="no-referrer"
                    onError={() => setCrestFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Crown className="h-9 w-9 text-[#D4AF37]" />
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs tracking-[0.22em] uppercase text-[#F3D578] font-medium">
                  Daily Interview Portal
                </p>
                <h1
                  className="font-royal text-3xl sm:text-[34px] font-semibold leading-tight text-[#FAF6EB]"
                  style={{ textWrap: 'balance' }}
                >
                  {config.welcomeTitle}
                </h1>
                <p className="text-sm font-medium tracking-wider text-[#D4AF37]">
                  {config.tagline}
                </p>
              </div>

              <p className="text-sm text-[#B7AA8E] leading-relaxed max-w-xs mx-auto pt-1">
                Select your applicant profile below to begin today&apos;s 5-question screening assessment.
              </p>
            </div>

            <div className="space-y-3.5 my-6">
              <button
                type="button"
                onClick={() => handleSelectTrack('Fresher')}
                className="w-full min-h-[84px] text-left rounded-2xl bg-[#11100C]/90 hover:bg-[#191711] border border-[#D4AF37]/35 hover:border-[#F3D578]/80 px-5 py-4 transition-all active:scale-[0.99] flex items-center justify-between gap-4 group"
              >
                <div className="space-y-1">
                  <span className="block font-royal text-2xl font-semibold text-[#FAF6EB]">
                    Fresher
                  </span>
                  <span className="block text-xs text-[#B7AA8E]">
                    New graduate or starting your first BPO &amp; corporate role
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-[#D4AF37] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectTrack('Experienced')}
                className="w-full min-h-[84px] text-left rounded-2xl bg-[#11100C]/90 hover:bg-[#191711] border border-[#D4AF37]/35 hover:border-[#F3D578]/80 px-5 py-4 transition-all active:scale-[0.99] flex items-center justify-between gap-4 group"
              >
                <div className="space-y-1">
                  <span className="block font-royal text-2xl font-semibold text-[#FAF6EB]">
                    Experienced
                  </span>
                  <span className="block text-xs text-[#B7AA8E]">
                    Prior customer support, voice, or process experience
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-[#D4AF37] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            <div className="pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs text-[#8D826B]">
              <span>5 Questions · 10 Marks</span>
              <span className="tabular-nums">{config.activeDate}</span>
            </div>
          </motion.section>
        )}

        {/* STEP 2: WELCOME & CANDIDATE PROFILE FORM */}
        {!loadingConfig && step === 'profile' && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            <div className="space-y-1 pb-5 border-b border-[#D4AF37]/20">
              <div className="flex items-center justify-between text-xs text-[#B7AA8E]">
                <span>Track · {track}</span>
                <button
                  type="button"
                  onClick={() => setStep('track')}
                  className="text-[#F3D578] hover:underline font-medium min-h-[32px] px-1"
                >
                  Change
                </button>
              </div>
              <h1 className="font-royal text-[28px] font-semibold leading-tight text-[#FAF6EB]">
                {config.welcomeTitle}
              </h1>
              <p className="text-xs font-medium tracking-wider text-[#D4AF37]">
                {config.tagline}
              </p>
            </div>

            <form
              onSubmit={(e) => void handleProfileContinue(e)}
              className="flex-1 flex flex-col justify-between pt-5 space-y-4"
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="cand-name" className="block text-xs font-medium text-[#E6DFCE]">
                    Full Name
                  </label>
                  <input
                    id="cand-name"
                    type="text"
                    required
                    maxLength={80}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full min-h-[46px] rounded-xl bg-[#11100C] border border-[#D4AF37]/30 px-3.5 text-sm text-[#FAF6EB] placeholder:text-[#6D6553] focus:outline-none focus:border-[#F3D578]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cand-mobile" className="block text-xs font-medium text-[#E6DFCE]">
                    Mobile Number
                  </label>
                  <input
                    id="cand-mobile"
                    type="tel"
                    inputMode="tel"
                    required
                    maxLength={20}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full min-h-[46px] rounded-xl bg-[#11100C] border border-[#D4AF37]/30 px-3.5 text-sm text-[#FAF6EB] placeholder:text-[#6D6553] focus:outline-none focus:border-[#F3D578] tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cand-email" className="block text-xs font-medium text-[#E6DFCE]">
                    Email ID
                  </label>
                  <input
                    id="cand-email"
                    type="email"
                    required
                    maxLength={120}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[46px] rounded-xl bg-[#11100C] border border-[#D4AF37]/30 px-3.5 text-sm text-[#FAF6EB] placeholder:text-[#6D6553] focus:outline-none focus:border-[#F3D578]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cand-company" className="block text-xs font-medium text-[#E6DFCE]">
                    Applying For
                  </label>
                  <select
                    id="cand-company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value as CompanyOption)}
                    className="w-full min-h-[46px] rounded-xl bg-[#11100C] border border-[#D4AF37]/30 px-3.5 text-sm text-[#FAF6EB] focus:outline-none focus:border-[#F3D578]"
                  >
                    {COMPANY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0B0A08] text-[#FAF6EB]">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {track === 'Experienced' && (
                  <div className="space-y-1.5">
                    <label htmlFor="cand-exp" className="block text-xs font-medium text-[#E6DFCE]">
                      Prior Experience
                    </label>
                    <select
                      id="cand-exp"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className="w-full min-h-[46px] rounded-xl bg-[#11100C] border border-[#D4AF37]/30 px-3.5 text-sm text-[#FAF6EB] focus:outline-none focus:border-[#F3D578]"
                    >
                      <option value="Under 1 Year" className="bg-[#0B0A08]">Under 1 Year</option>
                      <option value="1–2 Years" className="bg-[#0B0A08]">1–2 Years</option>
                      <option value="2–5 Years" className="bg-[#0B0A08]">2–5 Years</option>
                      <option value="5+ Years" className="bg-[#0B0A08]">5+ Years</option>
                    </select>
                  </div>
                )}

                {profileError && (
                  <p className="text-xs text-[#F4A261] font-medium">{profileError}</p>
                )}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={checkingDuplicate}
                  className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#C89B2B] via-[#E8C55A] to-[#D4AF37] hover:brightness-105 disabled:opacity-60 text-[#050505] font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <span>{checkingDuplicate ? 'Checking Eligibility...' : 'Start Assessment'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </motion.section>
        )}

        {/* STEP 3: QUESTIONS 1 TO 4 (DAILY BPO MCQs) */}
        {!loadingConfig && step === 'mcq' && currentQuestion && (
          <motion.section
            key={`mcq-${mcqIndex}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between text-xs text-[#B7AA8E] tabular-nums">
                <span>Question {mcqIndex + 1} of 5</span>
                <span>2 Marks · {company}</span>
              </div>

              <h2
                className="font-royal text-[26px] font-semibold leading-snug text-[#FAF6EB]"
                style={{ textWrap: 'balance' }}
              >
                {currentQuestion.prompt}
              </h2>

              <div className="space-y-3 pt-1">
                {currentQuestion.options.map((optText, idx) => {
                  const isSelected = mcqAnswers[mcqIndex] === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectMcqOption(idx)}
                      className={`w-full min-h-[54px] text-left rounded-xl px-4 py-3.5 border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-[#D4AF37]/15 border-[#F3D578] text-[#FAF6EB]'
                          : 'bg-[#11100C]/90 border-[#D4AF37]/25 text-[#E6DFCE] hover:border-[#D4AF37]/60'
                      }`}
                    >
                      <span
                        className={`mt-0.5 h-6 w-6 rounded-md text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums ${
                          isSelected
                            ? 'bg-[#D4AF37] text-[#050505]'
                            : 'bg-[#1B1912] text-[#F3D578]'
                        }`}
                      >
                        {OPTION_LETTERS[idx]}
                      </span>
                      <span className="text-sm leading-relaxed">{optText}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleMcqPrev}
                className="min-h-[48px] px-4 rounded-xl border border-[#D4AF37]/30 text-[#E6DFCE] hover:border-[#D4AF37]/60 text-sm font-medium flex items-center justify-center gap-1.5 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={mcqAnswers[mcqIndex] === null}
                onClick={handleMcqNext}
                className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-[#C89B2B] via-[#E8C55A] to-[#D4AF37] hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed text-[#050505] font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>{mcqIndex < 3 ? 'Next Question' : 'Continue to Question 5'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.section>
        )}

        {/* STEP 4: QUESTION 5 (SUBSCRIBE FIRST -> VIDEO TO LIKE -> COMMENT ON YOUTUBE) */}
        {!loadingConfig && step === 'video' && (
          <section className="flex-1 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#B7AA8E] tabular-nums">
                <span>Question 5 of 5 · Video IQ</span>
                <span>2 Marks</span>
              </div>

              {/* Immediate Fade-in Text Prompt */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="rounded-2xl bg-[#12100B]/95 border border-[#D4AF37]/35 p-4 space-y-2"
              >
                <p className="font-royal text-xl font-semibold text-[#F3D578]">
                  Let me check your IQ level
                </p>
                <p className="text-sm text-[#FAF6EB] leading-relaxed">
                  {config.iqPromptIntro}
                </p>
              </motion.div>

              {/* STEP 5A: SUBSCRIBE FIRST GATE */}
              {!subscribedClicked ? (
                <div className="rounded-2xl bg-[#11100C] border border-[#D4AF37]/30 p-5 text-center space-y-4">
                  <div className="mx-auto h-12 w-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-[#F3D578]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-royal text-xl font-semibold text-[#FAF6EB]">
                      Step 1: Subscribe First to Unlock Video
                    </h3>
                    <p className="text-xs text-[#B7AA8E] leading-relaxed">
                      Subscribe to <span className="text-[#F3D578]">@hendrysoulveyra</span> on YouTube first. Once subscribed, today&apos;s video will open so you can watch and like it.
                    </p>
                  </div>

                  <a
                    href={subscribeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSubscribedClicked(true)}
                    className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#C89B2B] via-[#E8C55A] to-[#D4AF37] hover:brightness-105 text-[#050505] font-semibold text-sm flex items-center justify-center gap-2 transition-all px-4"
                  >
                    <Youtube className="h-4 w-4" />
                    <span>Subscribe to @hendrysoulveyra</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setSubscribedClicked(true)}
                    className="min-h-[38px] text-xs text-[#B7AA8E] hover:text-[#F3D578] underline underline-offset-4 transition-colors"
                  >
                    Already subscribed? Unlock video now
                  </button>
                </div>
              ) : !likedClicked ? (
                /* STEP 5B: VIDEO OPENED -> WATCH FULL VIDEO & TAP LIKE */
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="rounded-2xl bg-[#11100C] border border-[#D4AF37]/30 p-4 space-y-3.5 text-center">
                    <p className="font-royal text-xl font-semibold text-[#F3D578]">
                      Step 2: Watch &amp; Like Today&apos;s Video
                    </p>

                    {embedUrl && youtubeVideoId ? (
                      <div className="mx-auto w-[220px] aspect-[9/16] rounded-2xl overflow-hidden border border-[#D4AF37]/45 bg-black shadow-lg">
                        <iframe
                          src={embedUrl}
                          title="Hendry_soulveyra Daily Interview Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="h-full w-full"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl bg-[#090806] border border-[#D4AF37]/25 p-4 space-y-2">
                        <Play className="h-6 w-6 text-[#F3D578] mx-auto" />
                        <p className="text-xs text-[#B7AA8E]">
                          Tap below to open today&apos;s YouTube Short on @hendrysoulveyra.
                        </p>
                      </div>
                    )}

                    <a
                      href={externalShortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setLikedClicked(true)}
                      className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#C89B2B] via-[#E8C55A] to-[#D4AF37] hover:brightness-105 text-[#050505] font-semibold text-sm flex items-center justify-center gap-2 transition-all px-4"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>Open Video &amp; Give 1 Like on YouTube</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setLikedClicked(true)}
                      className="min-h-[38px] text-xs text-[#B7AA8E] hover:text-[#F3D578] underline underline-offset-4 transition-colors"
                    >
                      I watched &amp; liked the video — continue to Question 5
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* STEP 5C: IQ QUESTION + COMMENT BOX + DIRECT YOUTUBE COMMENT POSTING */
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  {embedUrl && youtubeVideoId && (
                    <div className="mx-auto w-[170px] aspect-[9/16] rounded-xl overflow-hidden border border-[#D4AF37]/40 bg-black">
                      <iframe
                        src={embedUrl}
                        title="Hendry_soulveyra Daily Interview Video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <label
                      htmlFor="iq-answer"
                      className="block font-royal text-xl font-semibold text-[#FAF6EB]"
                    >
                      {selectedIqQuestion}
                    </label>
                    <textarea
                      id="iq-answer"
                      rows={3}
                      maxLength={1000}
                      value={iqResponse}
                      onChange={(e) => setIqResponse(e.target.value)}
                      placeholder="Write your comment / answer from the video..."
                      className="w-full rounded-xl bg-[#11100C] border border-[#D4AF37]/30 p-3.5 text-sm text-[#FAF6EB] placeholder:text-[#6D6553] focus:outline-none focus:border-[#F3D578] resize-none"
                    />
                    <div className="flex items-center justify-between text-xs text-[#8D826B] tabular-nums">
                      <span>{iqResponse.trim().length} / 1000 chars</span>
                      <span>Step 3 of 3</span>
                    </div>

                    <a
                      href={externalShortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleCopyForYoutube}
                      className="w-full min-h-[44px] rounded-xl bg-[#17150F] hover:bg-[#221E15] border border-[#D4AF37]/45 text-[#F3D578] text-xs font-semibold flex items-center justify-center gap-2 transition-colors px-3"
                    >
                      {copiedAnswer ? (
                        <Check className="h-4 w-4 text-[#8CE99A]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span>
                        {copiedAnswer
                          ? 'Copied! Paste & Post in YouTube Comments'
                          : 'Copy Comment & Post Directly on YouTube'}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <p className="text-[11px] text-[#8D826B] leading-relaxed">
                      YouTube requires posting comments inside YouTube with your own account. Tap above to copy your text and post it on the video before submitting.
                    </p>
                  </div>
                </motion.div>
              )}

              {iqError && <p className="text-xs text-[#F4A261] font-medium">{iqError}</p>}
              {submitError && <p className="text-xs text-[#F4A261] font-medium">{submitError}</p>}
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setMcqIndex(3);
                  setStep('mcq');
                }}
                className="min-h-[48px] px-4 rounded-xl border border-[#D4AF37]/30 text-[#E6DFCE] hover:border-[#D4AF37]/60 text-sm font-medium flex items-center justify-center gap-1.5 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!subscribedClicked || !likedClicked || submitting}
                onClick={() => void handleSubmitFinal()}
                className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-[#C89B2B] via-[#E8C55A] to-[#D4AF37] hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed text-[#050505] font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>{submitting ? 'Submitting Score...' : 'Submit & View Score'}</span>
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 5: FINAL ROYAL SCORE CARD */}
        {!loadingConfig && step === 'result' && finalResult && (
          <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col justify-center py-4 text-center space-y-5"
          >
            <div className="mx-auto h-14 w-14 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/45 flex items-center justify-center">
              <Crown className="h-7 w-7 text-[#F3D578]" />
            </div>

            <div className="space-y-1">
              <p className="text-xs tracking-[0.18em] uppercase text-[#F3D578] font-medium">
                Assessment Complete
              </p>
              <h1 className="font-royal text-3xl font-semibold text-[#FAF6EB]">
                {fullName}
              </h1>
              <p className="text-xs text-[#B7AA8E]">
                {track} · {company} · {config.activeDate}
              </p>
            </div>

            <div className="rounded-2xl bg-[#11100C]/95 border border-[#D4AF37]/40 py-6 px-4 space-y-2">
              <p className="text-xs uppercase tracking-[0.15em] text-[#B7AA8E]">
                Your Total Score
              </p>
              <div className="font-mono text-5xl font-semibold text-[#F3D578] tabular-nums">
                {finalResult.totalScore}{' '}
                <span className="text-2xl text-[#8D826B]">/ 10</span>
              </div>
              <p className="text-xs text-[#E6DFCE] tabular-nums pt-1">
                BPO MCQs: {finalResult.mcqScore} / 8 · Video IQ Challenge: {finalResult.iqScore} / 2
              </p>
            </div>

            <div className="rounded-2xl bg-[#11100C]/90 border border-[#D4AF37]/25 p-4 space-y-2">
              <p className="font-royal text-xl font-semibold text-[#FAF6EB] leading-snug">
                Thank you for your time! Meet your recruiter with your score.
              </p>
              <p className="text-xs text-[#B7AA8E]">
                Your submission is now locked for today. Please show this screen to your HR recruiter.
              </p>
            </div>

            <a
              href={externalShortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] rounded-xl bg-[#14120D] hover:bg-[#1E1B13] border border-[#D4AF37]/35 text-[#F3D578] text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Youtube className="h-4 w-4" />
              <span>Open @hendrysoulveyra to Like &amp; Comment</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            {isAdminSignedIn && (
              <button
                type="button"
                onClick={() => {
                  clearLocalSubmissionReceipt(config.activeDate);
                  setLockedReceipt(null);
                  setStep('track');
                  setFullName('');
                  setMobile('');
                  setEmail('');
                  setMcqIndex(0);
                  setMcqAnswers([null, null, null, null]);
                  setSubscribedClicked(false);
                  setLikedClicked(false);
                  setIqResponse('');
                  setFinalResult(null);
                }}
                className="min-h-[40px] text-xs text-[#B7AA8E] hover:text-[#F3D578] underline underline-offset-4"
              >
                HR Admin: Clear Test Lock &amp; Start Over
              </button>
            )}
          </motion.section>
        )}
      </main>
    </div>
  );
};
