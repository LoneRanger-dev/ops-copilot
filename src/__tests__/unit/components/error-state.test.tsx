import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '@/components/shared/error-state';

describe('ErrorState', () => {
  it('renders a plain-language message', () => {
    render(<ErrorState message="The request timed out." />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('The request timed out.')).toBeInTheDocument();
  });

  it('renders a correlation ID when provided', () => {
    render(<ErrorState message="Failed." correlationId="req_abc123" />);
    expect(screen.getByText(/req_abc123/)).toBeInTheDocument();
  });

  it('invokes onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState message="Failed." onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('omits the retry button when onRetry is not provided', () => {
    render(<ErrorState message="Failed." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
