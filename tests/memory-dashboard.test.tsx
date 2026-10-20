import { render, screen, within, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * The hosted memory service is its own product, so it gets its own
 * dashboard. These tests pin the split, because the failure mode is quiet:
 * re-adding memory to the agent sidebar, or moving the console back under
 * /dashboard, both look like tidy-ups and both put two independent services
 * behind one nav again.
 *
 * The distinction that matters: this is the hosted memory service (the NMAFC
 * tier — stats, records, connections). An agent's own MEMORY.md workspace is
 * agent hosting and stays on the agent dashboard, which the last test here
 * guards.
 */

const ROOT = process.cwd();

const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

const authState = vi.hoisted(() => ({
    user: {
        role: 'tenant_user',
        tenantId: 'tenant-1',
        email: 'user@example.com',
    } as { role: string; tenantId: string; email: string },
}));

/* The highlight test walks to a nested page, so the pathname mock reads a
   mutable cell (reset in afterEach). */
const navPath = vi.hoisted(() => ({ pathname: '/memory' }));

vi.mock('@/lib/AuthContext', () => ({
    useAuth: () => ({
        user: authState.user,
        isLoading: false,
        logout: vi.fn(),
    }),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => navPath.pathname,
    useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));

afterEach(() => {
    cleanup();
    navPath.pathname = '/memory';
    delete process.env.NEXT_PUBLIC_FEATURE_HOSTED_MEMORY;
});

/**
 * Same reasoning as the dashboard-nav suite: FeatureGate renders a pre-launch
 * notice instead of children while the hosted tier is dark, so the flag has
 * to be set before the layout module is imported.
 */
async function loadLayout() {
    vi.resetModules();
    process.env.NEXT_PUBLIC_FEATURE_HOSTED_MEMORY = 'true';
    return import('../app/memory/layout');
}

describe('memory dashboard nav', () => {
    it('lists the whole service surface, Console first', async () => {
        const { memoryNavItems } = await loadLayout();

        // The service is more than a store and a key list: the chat endpoints
        // and the drawn entity graph each get their own section, and Events
        // and Decay are tabs on Records rather than entries of their own —
        // seven items for five views was a sidebar reading like a sitemap.
        // Billing is the one non-service entry and comes last: one tenant
        // subscription and credit balance covers both products, so both
        // sidebars link the same /dashboard/billing surface.
        expect(memoryNavItems.map((i: { href: string }) => i.href)).toEqual([
            '/memory',
            '/memory/records',
            '/memory/graph',
            '/memory/playground',
            '/memory/connections',
            '/dashboard/billing',
        ]);
        expect(memoryNavItems.map((i: { label: string }) => i.label)).toEqual([
            'Console',
            'Records',
            'Graph',
            'Playground',
            'Connections',
            'Billing',
        ]);
        expect(memoryNavItems.every((i: { icon: unknown }) => Boolean(i.icon))).toBe(true);
    });

    it('gives every entry a unique href', async () => {
        const { memoryNavItems } = await loadLayout();

        const hrefs = memoryNavItems.map((i: { href: string }) => i.href);
        expect(new Set(hrefs).size).toBe(hrefs.length);
    });

    it('renders every section in the sidebar', async () => {
        const { default: MemoryLayout } = await loadLayout();

        render(
            <MemoryLayout>
                <p>child</p>
            </MemoryLayout>
        );

        const nav = screen.getByRole('navigation', { name: 'Memory dashboard' });
        const links = within(nav).getAllByRole('link');

        expect(links.map((l) => l.getAttribute('href'))).toEqual([
            '/memory',
            '/memory/records',
            '/memory/graph',
            '/memory/playground',
            '/memory/connections',
            '/dashboard/billing',
        ]);
        expect(links[0]).toHaveAccessibleName('Console');
        expect(links[1]).toHaveAccessibleName('Records');
        expect(links[4]).toHaveAccessibleName('Connections');
        expect(links[5]).toHaveAccessibleName('Billing');
    });

    /* The two services keep independent section lists — the memory nav never
       embeds agent sections. Hopping between them is the ProductSwitcher's
       job, not the sidebar's: identity moves, content does not. The single
       carve-out is Billing: the tenant's one subscription and credit balance
       covers both products, so the same page is linked from both shells. */
    it('links back to the agent dashboard only through the service switcher and shared billing', async () => {
        const { default: MemoryLayout } = await loadLayout();

        render(
            <MemoryLayout>
                <p>child</p>
            </MemoryLayout>
        );

        const nav = screen.getByRole('navigation', { name: 'Memory dashboard' });
        const hrefs = within(nav)
            .getAllByRole('link')
            .map((l) => l.getAttribute('href'));

        const agentSections = hrefs.filter(
            (href) => href?.startsWith('/dashboard') && href !== '/dashboard/billing'
        );
        expect(agentSections).toEqual([]);
        const switcher = screen.getByRole('group', { name: 'Switch service' });
        expect(within(switcher).getByRole('link', { name: 'Agents' })).toHaveAttribute(
            'href',
            '/dashboard'
        );
        // The user is inside Memory: the switch marks the product served.
        expect(within(switcher).getByRole('link', { name: 'Memory' })).toHaveAttribute(
            'aria-current',
            'page'
        );
    });
});

describe('sidebar highlight is a single aria-current (H3)', () => {
    it('waits until only Connections is current on /memory/connections', async () => {
        navPath.pathname = '/memory/connections';
        const { default: MemoryLayout } = await loadLayout();

        render(
            <MemoryLayout>
                <p>child</p>
            </MemoryLayout>
        );

        const nav = screen.getByRole('navigation', { name: 'Memory dashboard' });
        const current = within(nav)
            .getAllByRole('link')
            .filter((l) => l.getAttribute('aria-current') === 'page');
        expect(current.map((l) => l.textContent)).toEqual(['Connections']);

        // The section root stays dark on a nested page: /memory prefix-
        // matching made Console current on every records/graph page.
        expect(within(nav).getByRole('link', { name: 'Console' })).not.toHaveAttribute('aria-current');
        // Shared billing keeps highlighting across shells on prefix — it
        // really is the page the user is on.
        expect(within(nav).getByRole('link', { name: 'Billing' })).not.toHaveAttribute('aria-current');
    });

    it('marks the console only on its own page', async () => {
        navPath.pathname = '/memory';
        const { default: MemoryLayout } = await loadLayout();

        render(
            <MemoryLayout>
                <p>child</p>
            </MemoryLayout>
        );

        const nav = screen.getByRole('navigation', { name: 'Memory dashboard' });
        expect(
            within(nav)
                .getAllByRole('link')
                .filter((l) => l.getAttribute('aria-current') === 'page')
                .map((l) => l.textContent),
        ).toEqual(['Console']);
    });
});

describe('service separation', () => {
    it('serves the console from /memory, not from the agent dashboard', async () => {
        expect(existsSync(path.join(ROOT, 'app/memory/page.tsx'))).toBe(true);
        expect(existsSync(path.join(ROOT, 'app/memory/connections/page.tsx'))).toBe(true);
    });

    it('serves every nav section from a real route', async () => {
        const { memoryNavItems } = await loadLayout();

        // A nav entry with no page behind it is a 404 wearing a sidebar.
        for (const item of memoryNavItems) {
            if (item.href === '/dashboard/billing') {
                // The shared billing surface lives in the agent shell; both
                // nav lists point at the same page.
                expect(existsSync(path.join(ROOT, 'app/dashboard/billing/page.tsx'))).toBe(true);
                continue;
            }
            const rel =
                item.href === '/memory'
                    ? 'app/memory/page.tsx'
                    : `app/memory${item.href.slice('/memory'.length)}/page.tsx`;
            expect(existsSync(path.join(ROOT, rel))).toBe(true);
        }
    });

    /* Bookmarks, not a section: the old route forwards, which is the same
       courtesy /dashboard gives /dashboard/agents. */
    it('forwards the old agent-dashboard memory routes to the new dashboard', () => {
        const consoleRedirect = read('app/dashboard/memory/page.tsx');
        const connectionsRedirect = read('app/dashboard/memory/connections/page.tsx');

        expect(consoleRedirect).toContain("router.replace('/memory')");
        expect(connectionsRedirect).toContain("router.replace('/memory/connections')");
        // A redirect, not the console itself: nothing of the service's UI may
        // render under the agent dashboard again.
        expect(consoleRedirect).not.toContain('MemoryStatsHeader');
        expect(connectionsRedirect).not.toContain('mintMemoryConnection');
    });

    /* The agent card gave up its per-feature entry points (chat, workspace,
       drive, terminal, channels) in one pass, so the per-agent workspace
       editor is deliberately not mounted on the agents page anymore. The
       invariant that must keep holding is the service split: nothing from
       the hosted memory console leaks back into the agent view. */
    it('keeps the hosted memory console out of the agent dashboard', () => {
        const agentsPage = read('app/dashboard/agents/page.tsx');

        // The workspace editor is unmounted along with every other
        // per-feature modal while its card entry point is off.
        expect(agentsPage).not.toContain('MemoryEditor');
        expect(agentsPage).not.toContain('MemoryRecordTable');
        expect(agentsPage).not.toContain('MemoryStatsHeader');
    });
});
