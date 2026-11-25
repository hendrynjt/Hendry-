import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-[#050505] text-[#FAF6EB] flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl bg-[#0F0E0B] border border-[#D4AF37]/30 p-6 text-center space-y-4">
            <h1 className="font-royal text-2xl font-semibold text-[#F3D578]">
              Something went wrong
            </h1>
            <p className="text-sm text-[#B7AA8E] leading-relaxed">
              We encountered an issue connecting to the assessment studio. Please reload to try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] rounded-xl bg-[#D4AF37] text-[#050505] font-semibold text-sm hover:bg-[#F3D578] transition-colors"
            >
              Reload Assessment
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
