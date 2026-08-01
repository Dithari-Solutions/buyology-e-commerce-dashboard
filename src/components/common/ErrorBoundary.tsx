import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary. Catches render-time errors anywhere below it so a
 * single throwing component shows a recoverable fallback instead of white-
 * screening the entire admin panel. Wrap the app root with this.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface to console / any monitoring hook.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-gray-50 px-6 text-center dark:bg-gray-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/15">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F04438" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            An unexpected error occurred. Try reloading the page — if it keeps happening, contact the dev team.
          </p>
        </div>
        <button
          onClick={this.handleReload}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          Reload page
        </button>
      </div>
    );
  }
}
