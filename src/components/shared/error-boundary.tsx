'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/lib/observability/logger';
import { ErrorState } from './error-state';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * React error boundary (MASTER_BUILD_SPEC.md §23.3 frontend task 10).
 *
 * Class component because React only supports error boundaries via
 * `componentDidCatch`/`getDerivedStateFromError` — there is no hooks
 * equivalent. Renders `<ErrorState>` on catch, with a reset button that
 * clears the boundary's error and re-renders `children` from scratch.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error(
      { error: error.message, stack: error.stack, componentStack: info.componentStack },
      'Client-side render error caught by ErrorBoundary',
    );
  }

  private reset = (): void => this.setState({ error: null });

  override render() {
    if (this.state.error) {
      return (
        <ErrorState
          title={this.props.fallbackTitle ?? 'This section failed to render'}
          message={this.state.error.message || 'An unexpected error occurred.'}
          onRetry={this.reset}
        />
      );
    }

    return this.props.children;
  }
}
