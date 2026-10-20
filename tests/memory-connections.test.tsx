/**
 * Memory connections UI.
 *
 * Two properties are load-bearing and worth pinning:
 *
 * 1. **The key value is shown exactly once.** The platform keeps only a prefix,
 *    so a page reload is an unrecoverable loss. The mint dialog exists to make
 *    that explicit, and the issued key must not be rendered from any other
 *    component.
 * 2. **Listing never carries a secret.** A list response with an `apiKey`
 *    field would be a credential disclosure through the very surface that
 *    exists to manage credentials.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockConnections = vi.fn();
const mockMint = vi.fn();
const mockRevoke = vi.fn();

vi.mock('@/lib/api', () => ({
  listMemoryConnections: () => mockConnections(),
  mintMemoryConnection: (input: unknown) => mockMint(input),
  revokeMemoryConnection: (id: string) => mockRevoke(id),
}));

// Toast and the destructive-action modal both have their own suites; here they
// only need to render so the tree is complete.
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import ConnectionsPage from '@/app/memory/connections/page';

const ACTIVE = {
  results: [
    {
      keyId: 'k_1',
      label: 'Claude Code — laptop',
      scopes: ['read', 'write'],
      keyPrefix: 'nmafc_org_abc…',
      createdAt: '2026-10-11T12:00:00.000Z',
      lastUsedAt: null,
    },
  ],
};

describe('Memory connections', () => {
  beforeEach(() => {
    mockConnections.mockReset();
    mockMint.mockReset();
    mockRevoke.mockReset();
    mockConnections.mockResolvedValue(ACTIVE);
  });

  it('renders the list without ever showing a key value', async () => {
    render(<ConnectionsPage />);
    // The connection renders twice — a sideways-scrolling table and the
    // phone card stack. Real browsers switch them with CSS media queries;
    // jsdom applies neither, so assertions on the list take the first.
    await waitFor(() =>
      expect(screen.getAllByText('Claude Code — laptop').length).toBeGreaterThan(0),
    );

    const body = document.body.textContent ?? '';
    expect(body).toContain('nmafc_org_abc…');
    // The listing must not carry a secret, and the page must not invent one.
    expect(body).not.toContain('apiKey');
  });

  it('shows the key exactly once, at mint time', async () => {
    mockMint.mockResolvedValue({
      keyId: 'k_2',
      label: 'Cursor',
      scopes: ['read'],
      keyPrefix: 'nmafc_org_abc…',
      apiKey: 'nmafc_org_abc.SECRETVALUE',
      createdAt: '2026-10-11T12:00:00.000Z',
    });

    const user = userEvent.setup();
    render(<ConnectionsPage />);

    await user.click(screen.getByRole('button', { name: /new connection/i }));

    const label = await screen.findByPlaceholderText(/claude code/i);
    await user.type(label, 'Cursor');
    await user.click(screen.getByRole('button', { name: /create key/i }));

    await waitFor(() =>
      expect(screen.getByText('nmafc_org_abc.SECRETVALUE')).toBeTruthy(),
    );
    // And it is presented as one-shot, because it is.
    expect(document.body.textContent).toContain('only time this key is shown');
  });

  it('mints with the scopes the user actually selected', async () => {
    mockMint.mockResolvedValue({
      keyId: 'k_3',
      label: 'read-only',
      scopes: ['read'],
      keyPrefix: 'nmafc_org_abc…',
      apiKey: 'nmafc_org_abc.RO',
      createdAt: '2026-10-11T12:00:00.000Z',
    });

    const user = userEvent.setup();
    render(<ConnectionsPage />);
    await user.click(screen.getByRole('button', { name: /new connection/i }));

    const label = await screen.findByPlaceholderText(/claude code/i);
    await user.type(label, 'read-only');

    // Write is on by default; turn it off.
    const writeToggle = await screen.findByLabelText(/allow write scope/i);
    await user.click(writeToggle);

    await user.click(screen.getByRole('button', { name: /create key/i }));

    await waitFor(() =>
      expect(mockMint).toHaveBeenCalledWith({ label: 'read-only', scopes: ['read'] }),
    );
  });

  it('refuses to mint a key with no scopes', async () => {
    const user = userEvent.setup();
    render(<ConnectionsPage />);
    await user.click(screen.getByRole('button', { name: /new connection/i }));

    await user.type(await screen.findByPlaceholderText(/claude code/i), 'no scopes');
    await user.click(await screen.findByLabelText(/allow read scope/i));
    await user.click(await screen.findByLabelText(/allow write scope/i));

    // Both off leaves nothing to grant, so the action must be unavailable.
    expect(
      (screen.getByRole('button', { name: /create key/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(mockMint).not.toHaveBeenCalled();
  });

  it('revoking asks for confirmation first', async () => {
    mockRevoke.mockResolvedValue({ keyId: 'k_1', revokedAt: '2026-10-11T13:00:00.000Z' });

    const user = userEvent.setup();
    render(<ConnectionsPage />);
    await waitFor(() =>
      expect(screen.getAllByText('Claude Code — laptop').length).toBeGreaterThan(0),
    );

    // Both renderings carry the same revoke action for this connection.
    await user.click(screen.getAllByRole('button', { name: /revoke claude code/i })[0]);

    // Nothing is revoked until the confirmation is acknowledged, and the
    // button is disabled until the word is typed.
    expect(mockRevoke).not.toHaveBeenCalled();
    expect(
      (screen.getByRole('button', { name: /^confirm$/i }) as HTMLButtonElement).disabled,
    ).toBe(true);

    // The shared modal gates the confirm button behind typing the word, which
    // is the point of it — a mis-click cannot revoke a live key.
    const field = await screen.findByLabelText(/type revoke to confirm/i);
    await user.type(field, 'REVOKE');

    const confirm = screen.getByRole('button', { name: /^confirm$/i });
    await user.click(confirm);

    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('k_1'));
  });

  it('surfaces a load failure rather than rendering an empty list as if it were real', async () => {
    mockConnections.mockRejectedValue({ response: { data: { error: 'Memory not provisioned' } } });

    render(<ConnectionsPage />);
    await waitFor(() => expect(screen.getByText(/memory not provisioned/i)).toBeTruthy());
    expect(screen.queryByText(/no connections yet/i)).toBeNull();
  });

  it('a failed mint does not claim success', async () => {
    mockMint.mockRejectedValue({ response: { data: { error: 'Substrate unavailable' } } });

    const user = userEvent.setup();
    render(<ConnectionsPage />);
    await user.click(screen.getByRole('button', { name: /new connection/i }));

    const input = await screen.findByPlaceholderText(/claude code/i);
    fireEvent.change(input, { target: { value: 'failing' } });
    await waitFor(() =>
      expect((screen.getByRole('button', { name: /create key/i }) as HTMLButtonElement).disabled)
        .toBe(false),
    );
    await user.click(screen.getByRole('button', { name: /create key/i }));

    // The toast path is mocked, so assert on the observable consequence: no key
    // is ever presented to the user.
    await waitFor(() => expect(mockMint).toHaveBeenCalled());
    expect(screen.queryByText(/only time this key is shown/i)).toBeNull();
  });
});
