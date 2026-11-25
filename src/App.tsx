import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Crown, ExternalLink, Youtube } from 'lucide-react';
import { auth } from './firebase';
import { fetchDailyAssessment } from './services/assessmentService';
import {
  COMPANY_OPTIONS,
  DEFAULT_DAILY_ASSESSMENT,
  type DailyAssessmentConfig,
} from './types/assessment';
import { CandidatePortal } from './components/CandidatePortal';
import { HrStudio } from './components/HrStudio';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GoldenParticlesCanvas } from './components/GoldenParticlesCanvas';
import { buildYouTubeSubscribeUrl } from './utils/youtube';

type AppMode = 'candidate' | 'hr';

export default function App() {
  const [mode, setMode] = useState<AppMode>('candidate');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [config, setConfig] = useState<DailyAssessmentConfig>(DEFAULT_DAILY_ASSESSMENT);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const fetched = await fetchDailyAssessment();
        if (active) {
          setConfig(fetched);
        }
      } catch {
        // Fallback to default daily assessment if offline or unseeded
      } finally {
        if (active) {
          setLoadingConfig(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="relative min-h-dvh bg-[#050505] text-[#FAF6EB] overflow-x-hidden">
        {/* Golden Powder Particles Layer */}
        <GoldenParticlesCanvas />

        {/* Subtle warm gold corner ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.10),transparent_48%),radial-gradient(ellipse_at_bottom_left,rgba(184,134,11,0.08),transparent_50%)]"
        />

        {mode === 'hr' ? (
          <HrStudio
            user={user}
            authReady={authReady}
            config={config}
            onConfigSaved={(next) => setConfig(next)}
            onBackToCandidate={() => setMode('candidate')}
          />
        ) : (
          <div className="relative z-10 min-h-dvh lg:max-w-6xl lg:mx-auto lg:px-8 lg:py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            {/* Desktop Studio Companion Context */}
            <aside className="hidden lg:flex flex-col justify-between max-w-md space-y-8 py-4">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#F3D578] font-medium">
                  <Crown className="h-4 w-4 text-[#D4AF37]" />
                  <span>Royal Candidate Screening</span>
                </div>

                <h2
                  className="font-royal text-5xl font-semibold leading-[1.08] text-[#FAF6EB]"
                  style={{ textWrap: 'balance' }}
                >
                  Hendry_soulveyra
                </h2>
                <p className="text-base font-medium tracking-wide text-[#D4AF37]">
                  {config.tagline}
                </p>
                <p className="text-sm text-[#B7AA8E] leading-relaxed">
                  Designed in a vertical 9:16 mobile stage for walk-in and remote interview candidates. Select Fresher or Experienced, complete today&apos;s 4 BPO questions, subscribe and watch the daily YouTube Short, and receive your score out of 10.
                </p>
              </div>

              <div className="space-y-4 pt-6 border-t border-[#D4AF37]/20">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-[#E6DFCE]">
                    Active Hiring Partners
                  </p>
                  <p className="text-sm text-[#B7AA8E]">
                    {COMPANY_OPTIONS.join(' · ')}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={buildYouTubeSubscribeUrl(config.channelUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-4 rounded-xl bg-[#11100C] hover:bg-[#191711] border border-[#D4AF37]/35 text-xs font-semibold text-[#F3D578] inline-flex items-center gap-2 transition-colors"
                  >
                    <Youtube className="h-4 w-4" />
                    <span>@hendrysoulveyra</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setMode('hr')}
                    className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#C89B2B] via-[#E8C55A] to-[#D4AF37] hover:brightness-105 text-[#050505] text-xs font-semibold transition-all"
                  >
                    Open HR Daily Studio
                  </button>
                </div>
              </div>
            </aside>

            {/* Primary 9:16 Vertical Mobile Stage */}
            <div className="w-full lg:w-auto flex justify-center">
              <CandidatePortal
                config={config}
                loadingConfig={loadingConfig}
                isAdminSignedIn={Boolean(
                  user &&
                    user.emailVerified &&
                    user.email?.toLowerCase() === 'hendry.njt@gmail.com'
                )}
                onOpenHrStudio={() => setMode('hr')}
              />
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
