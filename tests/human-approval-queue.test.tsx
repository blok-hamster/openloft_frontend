import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * HumanApprovalQueue — H2 regression.
 *
 * The queue filtered `l.status === 'pending'` while the page fetched the
 * backend enum value 'pending_human_approval'. The filter matched nothing,
 * every batch of "pending approvals" silently disappeared, and shell
 * actions that needed a human passed unattended. TypeScript could not catch
 * it: IAuditLog.status is a plain string from the API.
 *
 * These tests keep the filter and the fetch enum in agreement on the
 * component level.
 */

const approveAction = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return {
        ...actual,
        approveAction,
    };
});

vi.mock('@/components/ui/Toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

import HumanApprovalQueue from '@/components/dashboard/HumanApprovalQueue';

afterEach(() => {
    cleanup();
});

const makeLog = (status: string, id = 'log-1') => ({
    _id: id,
    tenantId: 'tenant-1',
    agentId: 'agent-1',
    actionType: 'shell.execute',
    status,
    commandContext: 'rm -rf /tmp/fake',
    timestamp: new Date().toISOString(),
});

describe('HumanApprovalQueue', () => {
    it('renders logs carrying the backend enum value', () => {
        render(<HumanApprovalQueue logs={[makeLog('pending_human_approval')]} onUpdate={() => {}} />);

        expect(screen.getByText('Pending Approvals (1)')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    });

    it('still ignores the bare "pending" status the old filter matched', () => {
        // The dead filter is the regression itself: if the queue starts
        // rendering 'pending' logs again, either the page or the backend
        // enum changed and both sides must be re-checked together.
        render(<HumanApprovalQueue logs={[makeLog('pending')]} onUpdate={() => {}} />);

        expect(screen.queryByText(/Pending Approvals/)).not.toBeInTheDocument();
    });

    it('approves and reports back through the api helper', async () => {
        const user = userEvent.setup();
        approveAction.mockResolvedValue(makeLog('approved'));
        const onUpdate = vi.fn();

        render(<HumanApprovalQueue logs={[makeLog('pending_human_approval')]} onUpdate={onUpdate} />);
        await user.click(screen.getByRole('button', { name: 'Approve' }));

        await waitFor(() => expect(approveAction).toHaveBeenCalledWith('log-1', true));
        await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    });
});
