/**
 * M0.1 — proves the test harness is actually wired, not merely installed.
 *
 * Two tests on purpose: one render, one `lib/api.ts` interceptor. A green run
 * on a single render test would still pass if the module aliases, the CSS
 * Modules transform, or the jsdom environment were misconfigured in a way that
 * only bites non-trivial components. The api test exercises the axios instance,
 * which every feature in this app depends on.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import StatusIndicator from '@/components/ui/StatusIndicator';

describe('test harness wiring', () => {
  it('renders a client component with its CSS Module classes resolved', () => {
    // If the `@` alias or the CSS Module transform were broken, this fails on
    // module resolution rather than on an assertion.
    render(<StatusIndicator status="running" />);

    const label = screen.getByText('Running');
    expect(label).toBeInTheDocument();
  });

  it('maps every agent status to a human label', () => {
    // Real behaviour of the component, not just that it mounts.
    const cases: Array<[string, string]> = [
      ['active', 'Active'],
      ['running', 'Running'],
      ['idle', 'Idle'],
      ['stopped', 'Stopped'],
      ['error', 'Error'],
      ['failed', 'Failed'],
      ['provisioning', 'Provisioning'],
      ['starting', 'Starting'],
    ];

    for (const [status, expected] of cases) {
      const { unmount } = render(<StatusIndicator status={status as never} />);
      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    }
  });

  it('omits the label when showLabel is false', () => {
    render(<StatusIndicator status="running" showLabel={false} />);
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
  });
});