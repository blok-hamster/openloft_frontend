import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/docs',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import FrameworkBand from '@/components/landing/FrameworkBand';
import ProductsPage from '@/app/products/page';
import DocsPage from '@/app/docs/page';
import ResourcesPage from '@/app/resources/page';
import IntegrationGuide from '@/components/memory/IntegrationGuide';
import { SECTIONS, sectionText } from '@/app/docs/content';

afterEach(() => {
  cleanup();
});

describe('Landing FrameworkBand', () => {
  it('shows favorable LoCoMo metrics without False premise', () => {
    render(<FrameworkBand />);

    const text = document.body.textContent ?? '';
    expect(text).toContain('71.4%');
    expect(text).toContain('71.7%');
    expect(text).toContain('57.3%');
    expect(text).toContain('963 t');
    expect(text).toContain('CC BY-NC 4.0');
    expect(text).toContain('PolyForm Noncommercial 1.0.0');
    expect(text).toContain('Hermes plugin');

    expect(text).not.toMatch(/false premise/i);
    expect(text).not.toMatch(/apache-2\.0/i);
  });
});

describe('ProductsPage licence and package copy', () => {
  it('shows PolyForm Noncommercial 1.0.0 and pip install nmafc', () => {
    render(<ProductsPage />);

    const text = document.body.textContent ?? '';
    expect(text).toContain('PolyForm Noncommercial 1.0.0');
    expect(text).toContain('pip install nmafc');
    expect(text).not.toMatch(/apache-2\.0/i);
  });
});

describe('ResourcesPage licence and integrations', () => {
  it('references PolyForm Noncommercial 1.0.0 and Hermes plugin', () => {
    render(<ResourcesPage />);

    const text = document.body.textContent ?? '';
    expect(text).toContain('PolyForm Noncommercial 1.0.0');
    expect(text).toContain('openloft-memory');
    expect(text).not.toMatch(/apache-2\.0/i);
  });
});

describe('Docs content & search', () => {
  it('documents Python package installation, top-level API, fixed MemoryOpenAI, and Hermes plugin', () => {
    render(<DocsPage />);

    const text = document.body.textContent ?? '';
    expect(text).toContain('pip install "nmafc[llm]"');
    expect(text).toContain('from nmafc import SyncNeuromorphicMemory');
    expect(text).toContain('MemoryOpenAI(mem, client=');
    expect(text).toContain('openloft-memory');
    expect(text).toContain('OPENLOFT_MEMORY_API_KEY');
    expect(text).toContain('loft_recall');
    expect(text).toContain('loft_remember');
    expect(text).toContain('loft_forget');
    expect(text).toContain('PolyForm Noncommercial 1.0.0');

    expect(text).not.toMatch(/apache-2\.0/i);
    expect(text).not.toMatch(/false premise/i);
    expect(text).not.toContain('uv run --directory /path/to/nmafc');
  });

  it('indexes the Hermes plugin section for docs search', async () => {
    const hermesSection = SECTIONS.find((s) => s.id === 'hermes-plugin');
    expect(hermesSection).toBeDefined();
    expect(sectionText(hermesSection!)).toContain('openloft-memory');

    const user = userEvent.setup();
    render(<DocsPage />);

    const search = screen.getByLabelText(/search documentation/i);
    await user.type(search, 'hermes');

    expect(screen.getByRole('heading', { name: 'Hermes Agent plugin' })).toBeInTheDocument();
  });
});

describe('IntegrationGuide Hermes tab', () => {
  it('lets users copy the Hermes plugin setup with their minted key', async () => {
    const user = userEvent.setup();
    render(
      <IntegrationGuide
        apiKey="nmafc_org_test.SECRET"
        label="Hermes laptop"
        scopes={['read', 'write']}
      />,
    );

    const hermesTab = screen.getByRole('tab', { name: /hermes agent/i });
    await user.click(hermesTab);

    expect(hermesTab).toHaveAttribute('aria-selected', 'true');
    const text = document.body.textContent ?? '';
    expect(text).toContain('hermes plugins enable openloft-memory');
    expect(text).toContain('nmafc_org_test.SECRET');
  });
});

