import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockCreateTenant = vi.fn();
const mockUpdateSubscription = vi.fn();
const mockPush = vi.fn();
const mockPersistAuth = vi.fn();
const mockUpdateUser = vi.fn();
const mockToast = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/onboarding',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: { userId: 'u1', email: 'founder@acme.com', role: 'tenant_user' },
    updateUser: mockUpdateUser,
    persistAuth: mockPersistAuth,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    createTenant: (input: unknown) => mockCreateTenant(input),
    updateSubscription: (tenantId: string, tier: string) =>
      mockUpdateSubscription(tenantId, tier),
  };
});

import MemoryRecordTable from '@/components/memory/MemoryRecordTable';
import type { MemoryRecord } from '@/lib/api';

describe('MemoryRecordTable segmentation', () => {
  afterEach(() => {
    cleanup();
  });

  const RECORDS: MemoryRecord[] = [
    {
      id: 'r1',
      agent_id: 'support-bot',
      conversation_id: 'conv-alpha',
      entity_name: 'billing_plan',
      fact_content: 'Enterprise annual subscription',
      memory_type: 'CoreAnchor',
      weight: 0.98,
      consolidation_index: 2,
      created_at_turn: 12,
      last_reinforced_turn: 12,
      is_active: true,
      related_entities: [],
      valid_at: 12,
      valid_at_text: null,
      invalid_at: null,
      created_date: '2026-11-10',
    },
    {
      id: 'r2',
      agent_id: null,
      conversation_id: 'default',
      entity_name: 'timezone',
      fact_content: 'UTC+1',
      memory_type: 'ActiveContext',
      weight: 0.72,
      consolidation_index: 0,
      created_at_turn: 4,
      last_reinforced_turn: 4,
      is_active: true,
      related_entities: [],
      valid_at: 4,
      valid_at_text: null,
      invalid_at: null,
      created_date: null,
    },
  ];

  it('renders one unified table with segment divider headers and scope filter actions', async () => {
    const user = userEvent.setup();
    const onFilterScope = vi.fn();

    render(
      <MemoryRecordTable
        records={RECORDS}
        total={2}
        limit={50}
        offset={0}
        loading={false}
        sort={{ key: 'turn', dir: 'desc' }}
        onSortChange={vi.fn()}
        onLimitChange={vi.fn()}
        onOffsetChange={vi.fn()}
        onSelect={vi.fn()}
        onFilterScope={onFilterScope}
      />,
    );

    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(1);
    const table = tables[0];

    // Segment divider headers carry both conversation_id and agent_id tags.
    expect(within(table).getAllByText('conv-alpha').length).toBeGreaterThanOrEqual(2);
    expect(within(table).getAllByText('support-bot').length).toBeGreaterThanOrEqual(2);
    expect(within(table).getAllByText('default').length).toBeGreaterThanOrEqual(3);

    const filterButtons = within(table).getAllByRole('button', { name: 'Filter scope' });
    expect(filterButtons).toHaveLength(2);
    await user.click(filterButtons[0]);
    expect(onFilterScope).toHaveBeenCalledWith({
      conversationId: 'conv-alpha',
      agentId: 'support-bot',
    });
  });
});

describe('Onboarding flow without LLM API key prompt', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_FEATURE_HOSTED_HARNESS = 'true';
    mockCreateTenant.mockReset();
    mockUpdateSubscription.mockReset();
    mockPush.mockReset();
    mockPersistAuth.mockReset();
    mockUpdateUser.mockReset();
    mockToast.mockReset();
    mockCreateTenant.mockResolvedValue({ tenantId: 'org_new', token: 'jwt-new' });
    mockUpdateSubscription.mockResolvedValue({ message: 'ok' });
  });

  afterEach(() => {
    cleanup();
    delete process.env.NEXT_PUBLIC_FEATURE_HOSTED_HARNESS;
  });

  it('completes onboarding in 2 steps without prompting for LLM API keys', async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_FEATURE_HOSTED_HARNESS = 'true';
    const { default: OnboardingPage } = await import('@/app/onboarding/page');

    const user = userEvent.setup();
    render(<OnboardingPage />);

    expect(screen.getByText(/Name your organization/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Organization Name/i), 'Acme Corp');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByText(/Select your plan/i)).toBeInTheDocument();
    });

    // LLM API key prompt is absent from onboarding.
    expect(screen.queryByText(/Add your API keys/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/OpenAI API Key/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Anthropic API Key/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Launch Workspace/i }));
    await waitFor(() => {
      expect(mockUpdateSubscription).toHaveBeenCalledWith('org_new', 'hobby');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
