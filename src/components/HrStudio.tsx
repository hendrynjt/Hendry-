import React, { useEffect, useMemo, useState } from 'react';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  Check,
  Copy,
  Crown,
  ExternalLink,
  LogIn,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Unlock,
  Youtube,
} from 'lucide-react';
import { ADMIN_EMAIL, auth, googleProvider } from '../firebase';
import {
  clearLocalSubmissionReceipt,
  deleteCandidateSubmission,
  saveDailyAssessment,
  subscribeCandidateSubmissions,
  updateCandidateIqScore,
} from '../services/assessmentService';
import {
  COMPANY_OPTIONS,
  DEFAULT_DAILY_ASSESSMENT,
  getTodayIsoDate,
  type CandidateSubmissionRecord,
  type DailyAssessmentConfig,
  type McqQuestion,
} from '../types/assessment';
import { buildYouTubeEmbedUrl, extractYouTubeVideoId } from '../utils/youtube';

interface HrStudioProps {
  user: User | null;
  authReady: boolean;
  config: DailyAssessmentConfig;
  onConfigSaved: (next: DailyAssessmentConfig) => void;
  onBackToCandidate: () => void;
}

type StudioTab = 'questions' | 'candidates';

export const HrStudio: React.FC<HrStudioProps> = ({
  user,
  authReady,
  config,
  onConfigSaved,
  onBackToCandidate,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('questions');
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const [draft, setDraft] = useState<DailyAssessmentConfig>(config);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [clearedDeviceLock, setClearedDeviceLock] = useState(false);

  const [submissions, setSubmissions] = useState<CandidateSubmissionRecord[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('All');
  const [trackFilter, setTrackFilter] = useState<string>('All');

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const isAuthorizedAdmin = Boolean(
    user && user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  useEffect(() => {
    if (!authReady || !isAuthorizedAdmin) {
      setSubmissions([]);
      return;
    }

    setLoadingSubmissions(true);
    const unsub = subscribeCandidateSubmissions(
      (items) => {
        setSubmissions(items);
        setLoadingSubmissions(false);
      },
      () => {
        setLoadingSubmissions(false);
      }
    );

    return () => unsub();
  }, [authReady, isAuthorizedAdmin]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to sign in with Google right now.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleCopyCandidateLink = () => {
    const shareUrl = window.location.origin;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleClearDeviceLock = () => {
    clearLocalSubmissionReceipt(config.activeDate);
    setClearedDeviceLock(true);
    window.setTimeout(() => setClearedDeviceLock(false), 3000);
  };

  const handleQuestionChange = (
    idx: number,
    updater: (q: McqQuestion) => McqQuestion
  ) => {
    setDraft((prev) => {
      const nextQuestions = [...prev.questions] as [
        McqQuestion,
        McqQuestion,
        McqQuestion,
        McqQuestion,
      ];
      nextQuestions[idx] = updater(nextQuestions[idx]);
      return { ...prev, questions: nextQuestions };
    });
  };

  const handleIqPromptChange = (idx: number, value: string) => {
    setDraft((prev) => {
      const next = [...prev.iqPrompts];
      next[idx] = value;
      return { ...prev, iqPrompts: next };
    });
  };

  const handleAddIqPrompt = () => {
    setDraft((prev) => {
      if (prev.iqPrompts.length >= 8) return prev;
      return {
        ...prev,
        iqPrompts: [...prev.iqPrompts, 'What key lesson did you learn from this video?'],
      };
    });
  };

  const handleRemoveIqPrompt = (idx: number) => {
    setDraft((prev) => {
      if (prev.iqPrompts.length <= 1) return prev;
      return {
        ...prev,
        iqPrompts: prev.iqPrompts.filter((_, i) => i !== idx),
      };
    });
  };

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaveNotice('');
    setSaveError('');
    setSaving(true);
    try {
      await saveDailyAssessment(draft, user.uid);
      onConfigSaved(draft);
      setSaveNotice("Today's assessment & YouTube Shorts link published live for all candidates.");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to publish daily assessment.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setDraft({
      ...DEFAULT_DAILY_ASSESSMENT,
      activeDate: getTodayIsoDate(),
    });
    setSaveNotice('Loaded default BPO template. Click Publish to make it live.');
  };

  const parsedShortId = useMemo(
    () => extractYouTubeVideoId(draft.youtubeShortsUrl),
    [draft.youtubeShortsUrl]
  );

  const previewEmbedUrl = useMemo(
    () => buildYouTubeEmbedUrl(draft.youtubeShortsUrl),
    [draft.youtubeShortsUrl]
  );

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return submissions.filter((item) => {
      if (companyFilter !== 'All' && item.company !== companyFilter) return false;
      if (trackFilter !== 'All' && item.track !== trackFilter) return false;
      if (!q) return true;
      return (
        item.fullName.toLowerCase().includes(q) ||
        item.mobile.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q)
      );
    });
  }, [submissions, searchQuery, companyFilter, trackFilter]);

  const stats = useMemo(() => {
    const today = getTodayIsoDate();
    const todayCount = submissions.filter((s) => s.assessmentDate === today).length;
    const avg =
      submissions.length > 0
        ? (
            submissions.reduce((sum, s) => sum + (s.totalScore || 0), 0) /
            submissions.length
          ).toFixed(1)
        : '0.0';
    const subClicks = submissions.filter((s) => s.subscribedConfirmed).length;
    return { total: submissions.length, todayCount, avg, subClicks };
  }, [submissions]);

  return (
    <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Three-Zone Top Bar */}
      <header className="flex items-center justify-between gap-8 pb-4 border-b border-[#D4AF37]/25">
        <button
          type="button"
          onClick={onBackToCandidate}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
        >
          <Crown className="h-5 w-5 text-[#D4AF37]" />
          <span className="font-royal text-xl font-semibold text-[#FAF6EB]">
            Hendry_soulveyra
          </span>
        </button>

        {isAuthorizedAdmin ? (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'questions'
                  ? 'text-[#F3D578] underline underline-offset-8'
                  : 'text-[#B7AA8E] hover:text-[#FAF6EB]'
              }`}
            >
              Daily Questions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('candidates')}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'candidates'
                  ? 'text-[#F3D578] underline underline-offset-8'
                  : 'text-[#B7AA8E] hover:text-[#FAF6EB]'
              }`}
            >
              Candidate Scores
            </button>
          </nav>
        ) : (
          <span className="hidden md:inline text-xs text-[#8D826B] whitespace-nowrap">
            Recruiter Assessment Studio
          </span>
        )}

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onBackToCandidate}
            className="min-h-[40px] px-4 rounded-xl bg-[#11100C] hover:bg-[#1A1812] border border-[#D4AF37]/35 text-xs font-medium text-[#F3D578] whitespace-nowrap shrink-0"
          >
            Candidate View
          </button>
        </div>
      </header>

      {/* Mobile Tab Bar when signed in */}
      {isAuthorizedAdmin && (
        <div className="flex md:hidden items-center gap-2 p-1 rounded-xl bg-[#11100C] border border-[#D4AF37]/25">
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'questions'
                ? 'bg-[#D4AF37] text-[#050505]'
                : 'text-[#B7AA8E]'
            }`}
          >
            Daily Questions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('candidates')}
            className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'candidates'
                ? 'bg-[#D4AF37] text-[#050505]'
                : 'text-[#B7AA8E]'
            }`}
          >
            Candidate Scores ({submissions.length})
          </button>
        </div>
      )}

      {/* Auth Gate */}
      {!user ? (
        <div className="max-w-md mx-auto rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/35 p-7 text-center space-y-5 my-12">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center">
            <Crown className="h-7 w-7 text-[#D4AF37]" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-royal text-3xl font-semibold text-[#FAF6EB]">
              HR Studio Sign In
            </h1>
            <p className="text-sm text-[#B7AA8E] leading-relaxed">
              Sign in with your Google account ({ADMIN_EMAIL}) to update today&apos;s 4 BPO questions, swap the daily YouTube Shorts link, and view candidate scores.
            </p>
          </div>
          {authError && <p className="text-xs text-[#F4A261]">{authError}</p>}
          <button
            type="button"
            disabled={signingIn}
            onClick={() => void handleGoogleSignIn()}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#C89B2B] via-[#E8C55A] to-[#D4AF37] hover:brightness-105 text-[#050505] font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <LogIn className="h-4 w-4" />
            <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>
        </div>
      ) : !isAuthorizedAdmin ? (
        <div className="max-w-md mx-auto rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/35 p-7 text-center space-y-4 my-12">
          <h1 className="font-royal text-2xl font-semibold text-[#FAF6EB]">
            Recruiter Access Restricted
          </h1>
          <p className="text-sm text-[#B7AA8E]">
            Signed in as <span className="text-[#FAF6EB]">{user.email}</span>. Only the authorized HR account ({ADMIN_EMAIL}) can manage daily questions and view candidate phone numbers.
          </p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="min-h-[44px] px-5 rounded-xl border border-[#D4AF37]/35 text-sm font-medium text-[#F3D578] hover:bg-[#191711]"
          >
            Switch Google Account
          </button>
        </div>
      ) : (
        <>
          {/* Admin Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 px-5 py-3.5">
            <div className="space-y-0.5">
              <p className="text-xs text-[#B7AA8E]">
                Signed in as <span className="text-[#FAF6EB] font-medium">{user.email}</span>
              </p>
              <p className="text-xs text-[#8D826B]">
                Share your candidate screening link every morning so walk-ins see today&apos;s live questions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleClearDeviceLock}
                className="min-h-[40px] px-3.5 rounded-xl border border-[#D4AF37]/25 text-xs font-medium text-[#B7AA8E] hover:text-[#F3D578] flex items-center gap-1.5 whitespace-nowrap"
              >
                <Unlock className="h-3.5 w-3.5" />
                <span>{clearedDeviceLock ? 'Device Lock Cleared' : 'Clear This Device Lock'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyCandidateLink}
                className="min-h-[40px] px-4 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/45 text-xs font-semibold text-[#F3D578] hover:bg-[#D4AF37]/25 flex items-center gap-2 whitespace-nowrap"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Candidate Link Copied' : 'Copy Candidate Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="min-h-[40px] px-3.5 rounded-xl border border-[#D4AF37]/25 text-xs font-medium text-[#B7AA8E] hover:text-[#FAF6EB] flex items-center gap-1.5 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* TAB 1: DAILY QUESTIONS & YOUTUBE SHORTS EDITOR */}
          {activeTab === 'questions' && (
            <form onSubmit={(e) => void handleSaveAssessment(e)} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-6">
                  <div className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 p-5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="font-royal text-2xl font-semibold text-[#FAF6EB]">
                        Daily Header &amp; YouTube Shorts Link
                      </h2>
                      <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="text-xs text-[#B7AA8E] hover:text-[#F3D578] inline-flex items-center gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reset Defaults</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[#E6DFCE]">
                          Active Date
                        </label>
                        <input
                          type="date"
                          value={draft.activeDate}
                          onChange={(e) => setDraft({ ...draft, activeDate: e.target.value })}
                          className="w-full min-h-[44px] rounded-xl bg-[#080705] border border-[#D4AF37]/30 px-3 text-sm text-[#FAF6EB] tabular-nums"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[#E6DFCE]">
                          Tagline
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={draft.tagline}
                          onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
                          className="w-full min-h-[44px] rounded-xl bg-[#080705] border border-[#D4AF37]/30 px-3 text-sm text-[#FAF6EB]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[#E6DFCE]">
                        Today&apos;s YouTube Shorts URL (Question 5 Video)
                      </label>
                      <input
                        type="url"
                        required
                        maxLength={300}
                        value={draft.youtubeShortsUrl}
                        onChange={(e) =>
                          setDraft({ ...draft, youtubeShortsUrl: e.target.value })
                        }
                        placeholder="https://youtube.com/shorts/VIDEO_ID"
                        className="w-full min-h-[44px] rounded-xl bg-[#080705] border border-[#D4AF37]/30 px-3 text-sm text-[#FAF6EB]"
                      />
                      <p className="text-xs text-[#8D826B]">
                        {parsedShortId
                          ? `Detected YouTube Video ID: ${parsedShortId} (9:16 embed & direct comments ready)`
                          : 'Paste your exact daily YouTube Short URL (e.g. https://youtube.com/shorts/...) so candidates can watch, like, and comment directly on that Short.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[#E6DFCE]">
                        YouTube Channel Subscribe URL
                      </label>
                      <input
                        type="url"
                        required
                        maxLength={300}
                        value={draft.channelUrl}
                        onChange={(e) => setDraft({ ...draft, channelUrl: e.target.value })}
                        className="w-full min-h-[44px] rounded-xl bg-[#080705] border border-[#D4AF37]/30 px-3 text-sm text-[#FAF6EB]"
                      />
                    </div>
                  </div>

                  {/* 4 Daily BPO MCQs */}
                  <div className="space-y-4">
                    <h2 className="font-royal text-2xl font-semibold text-[#FAF6EB]">
                      Daily BPO Questions (Questions 1–4 · 2 Marks Each)
                    </h2>

                    {draft.questions.map((q, qIdx) => (
                      <div
                        key={q.id || qIdx}
                        className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 p-5 space-y-3.5"
                      >
                        <div className="flex items-center justify-between text-xs text-[#F3D578] font-medium">
                          <span>Question {qIdx + 1}</span>
                          <span>Select radio next to correct answer</span>
                        </div>

                        <input
                          type="text"
                          required
                          maxLength={300}
                          value={q.prompt}
                          onChange={(e) =>
                            handleQuestionChange(qIdx, (prev) => ({
                              ...prev,
                              prompt: e.target.value,
                            }))
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#080705] border border-[#D4AF37]/30 px-3.5 text-sm text-[#FAF6EB]"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(['A', 'B', 'C', 'D'] as const).map((letter, optIdx) => (
                            <label
                              key={letter}
                              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border cursor-pointer ${
                                q.correctIndex === optIdx
                                  ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                                  : 'border-[#D4AF37]/20 bg-[#080705]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={q.correctIndex === optIdx}
                                onChange={() =>
                                  handleQuestionChange(qIdx, (prev) => ({
                                    ...prev,
                                    correctIndex: optIdx as 0 | 1 | 2 | 3,
                                  }))
                                }
                                className="accent-[#D4AF37]"
                              />
                              <span className="text-xs font-semibold text-[#F3D578] w-4">
                                {letter}
                              </span>
                              <input
                                type="text"
                                required
                                maxLength={200}
                                value={q.options[optIdx]}
                                onChange={(e) =>
                                  handleQuestionChange(qIdx, (prev) => {
                                    const nextOpts = [...prev.options] as [
                                      string,
                                      string,
                                      string,
                                      string,
                                    ];
                                    nextOpts[optIdx] = e.target.value;
                                    return { ...prev, options: nextOpts };
                                  })
                                }
                                className="w-full bg-transparent text-xs text-[#FAF6EB] focus:outline-none"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 5 Cols */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 p-5 space-y-4">
                    <h2 className="font-royal text-2xl font-semibold text-[#FAF6EB]">
                      Question 5 · Video IQ Prompts
                    </h2>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[#E6DFCE]">
                        Immediate Fade-in Message Above Video
                      </label>
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={draft.iqPromptIntro}
                        onChange={(e) => setDraft({ ...draft, iqPromptIntro: e.target.value })}
                        className="w-full rounded-xl bg-[#080705] border border-[#D4AF37]/30 p-3 text-xs text-[#FAF6EB] leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#E6DFCE]">
                          Random IQ Question Pool ({draft.iqPrompts.length} / 8)
                        </span>
                        <button
                          type="button"
                          disabled={draft.iqPrompts.length >= 8}
                          onClick={handleAddIqPrompt}
                          className="text-xs text-[#F3D578] hover:underline inline-flex items-center gap-1 disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Prompt</span>
                        </button>
                      </div>

                      {draft.iqPrompts.map((promptText, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            maxLength={240}
                            value={promptText}
                            onChange={(e) => handleIqPromptChange(idx, e.target.value)}
                            className="flex-1 min-h-[42px] rounded-xl bg-[#080705] border border-[#D4AF37]/30 px-3 text-xs text-[#FAF6EB]"
                          />
                          {draft.iqPrompts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveIqPrompt(idx)}
                              aria-label="Remove IQ prompt"
                              className="min-h-[42px] min-w-[42px] rounded-xl border border-[#D4AF37]/25 text-[#8D826B] hover:text-[#F4A261] flex items-center justify-center"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live 9:16 Embed Preview */}
                  <div className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#FAF6EB]">
                        YouTube Shorts 9:16 Preview
                      </h3>
                      <a
                        href={draft.youtubeShortsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#F3D578] inline-flex items-center gap-1 hover:underline"
                      >
                        <Youtube className="h-3.5 w-3.5" />
                        <span>Open Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {previewEmbedUrl ? (
                      <div className="mx-auto w-[190px] aspect-[9/16] rounded-xl overflow-hidden border border-[#D4AF37]/40 bg-black">
                        <iframe
                          src={previewEmbedUrl}
                          title="YouTube Shorts Preview"
                          allowFullScreen
                          className="h-full w-full"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-[#8D826B] py-4 text-center">
                        Paste a YouTube Shorts link (e.g. https://youtube.com/shorts/abc123XYZ) to preview the 9:16 player here.
                      </p>
                    )}
                  </div>

                  {/* Publish Button */}
                  <div className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/35 p-5 space-y-3">
                    {saveNotice && (
                      <p className="text-xs text-[#8CE99A] font-medium">{saveNotice}</p>
                    )}
                    {saveError && (
                      <p className="text-xs text-[#F4A261] font-medium">{saveError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#C89B2B] via-[#E8C55A] to-[#D4AF37] hover:brightness-105 disabled:opacity-50 text-[#050505] font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <Save className="h-4 w-4" />
                      <span>
                        {saving ? 'Publishing...' : "Publish Today's Assessment"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: CANDIDATE SUBMISSIONS & SCORES */}
          {activeTab === 'candidates' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 p-4 space-y-1">
                  <p className="text-xs text-[#8D826B]">Total Candidates</p>
                  <p className="font-mono text-2xl font-semibold text-[#FAF6EB] tabular-nums">
                    {stats.total}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 p-4 space-y-1">
                  <p className="text-xs text-[#8D826B]">Today&apos;s Walk-ins</p>
                  <p className="font-mono text-2xl font-semibold text-[#F3D578] tabular-nums">
                    {stats.todayCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 p-4 space-y-1">
                  <p className="text-xs text-[#8D826B]">Average Score</p>
                  <p className="font-mono text-2xl font-semibold text-[#FAF6EB] tabular-nums">
                    {stats.avg} <span className="text-sm text-[#8D826B]">/ 10</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 p-4 space-y-1">
                  <p className="text-xs text-[#8D826B]">Subscribe Clicks</p>
                  <p className="font-mono text-2xl font-semibold text-[#FAF6EB] tabular-nums">
                    {stats.subClicks}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="h-4 w-4 text-[#8D826B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate name, phone, or email..."
                    className="w-full min-h-[44px] rounded-xl bg-[#0F0E0B] border border-[#D4AF37]/30 pl-10 pr-3.5 text-sm text-[#FAF6EB] placeholder:text-[#6D6553]"
                  />
                </div>

                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="min-h-[44px] rounded-xl bg-[#0F0E0B] border border-[#D4AF37]/30 px-3.5 text-xs text-[#FAF6EB]"
                >
                  <option value="All">All Companies</option>
                  {COMPANY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={trackFilter}
                  onChange={(e) => setTrackFilter(e.target.value)}
                  className="min-h-[44px] rounded-xl bg-[#0F0E0B] border border-[#D4AF37]/30 px-3.5 text-xs text-[#FAF6EB]"
                >
                  <option value="All">All Tracks</option>
                  <option value="Fresher">Fresher</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>

              {loadingSubmissions ? (
                <div className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 p-10 text-center text-sm text-[#B7AA8E]">
                  Loading candidate assessments...
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 p-10 text-center space-y-2">
                  <p className="font-royal text-xl text-[#FAF6EB]">
                    No candidate submissions yet
                  </p>
                  <p className="text-xs text-[#8D826B]">
                    Share the candidate assessment link with walk-in applicants to see their scores and YouTube video responses appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="rounded-2xl bg-[#0F0E0B]/95 border border-[#D4AF37]/25 p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-royal text-xl font-semibold text-[#FAF6EB]">
                              {sub.fullName}
                            </h3>
                            <span className="text-xs text-[#F3D578]">
                              · {sub.track}
                              {sub.track === 'Experienced' && sub.experienceYears
                                ? ` (${sub.experienceYears})`
                                : ''}
                            </span>
                            <span className="text-xs text-[#B7AA8E]">· {sub.company}</span>
                          </div>
                          <p className="text-xs text-[#8D826B] tabular-nums">
                            {sub.mobile} · {sub.email} · {sub.assessmentDate}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-mono text-2xl font-semibold text-[#F3D578] tabular-nums">
                              {sub.totalScore} / 10
                            </p>
                            <p className="text-[11px] text-[#8D826B] tabular-nums">
                              MCQ {sub.mcqScore}/8 · IQ {sub.iqScore}/2
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#D4AF37]/15 space-y-1.5">
                        <p className="text-xs font-medium text-[#E6DFCE]">
                          Video IQ Prompt: {sub.iqQuestion}
                        </p>
                        <p className="text-sm text-[#B7AA8E] leading-relaxed">
                          &ldquo;{sub.iqResponse}&rdquo;
                        </p>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-[#8D826B]">
                          {sub.subscribedConfirmed
                            ? 'Opened YouTube Subscribe prompt'
                            : 'Did not click subscribe link'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void updateCandidateIqScore(
                                sub.id,
                                sub.iqScore === 2 ? 0 : 2,
                                sub.mcqScore
                              )
                            }
                            className="min-h-[34px] px-3 rounded-lg border border-[#D4AF37]/30 text-[#F3D578] hover:bg-[#D4AF37]/10"
                          >
                            {sub.iqScore === 2 ? 'Set IQ to 0/2' : 'Award IQ 2/2'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteCandidateSubmission(sub)}
                            aria-label="Delete submission and unlock candidate"
                            className="min-h-[34px] px-3 rounded-lg border border-[#D4AF37]/25 text-[#B7AA8E] hover:text-[#F4A261] inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete &amp; Unlock</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
