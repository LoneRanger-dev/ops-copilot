import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InboxIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

describe('EmptyState', () => {
  it('renders the title and icon', () => {
    render(<EmptyState icon={InboxIcon} title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders an optional description and action', () => {
    render(
      <EmptyState
        icon={InboxIcon}
        title="Nothing here"
        description="Try again later."
        action={<button type="button">Retry</button>}
      />,
    );
    expect(screen.getByText('Try again later.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('omits the description when none is given', () => {
    render(<EmptyState icon={InboxIcon} title="Nothing here" />);
    expect(screen.queryByText('Try again later.')).not.toBeInTheDocument();
  });
});
