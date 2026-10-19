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

vi.mock('@/lib/AuthContext', () => ({
    useAuth: () => ({
        user: authState.user,
        isLoading: false,
        logout: vi.fn(),
    }),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/memory',
    useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));

afterEach(() => {
    cleanup();
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
        // and the read-only observability over records, events, graph and
        // decay each get a section, or the dashboard under-reports what the
        // product does.
        expect(memoryNavItems.map((i: { href: string }) => i.href)).toEqual([
            '/memory',
            '/memory/records',
            '/memory/events',
            '/memory/graph',
            '/memory/decay',
            '/memory/playground',
            '/memory/connections',
        ]);
        expect(memoryNavItems.map((i: { label: string }) => i.label)).toEqual([
            'Console',
            'Records',
            'Events',
            'Graph',
            'Decay',
            'Playground',
            'Connections',
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
            '/memory/events',
            '/memory/graph',
            '/memory/decay',
            '/memory/playground',
            '/memory/connections',
        ]);
        expect(links[0]).toHaveAccessibleName('Console');
        expect(links[1]).toHaveAccessibleName('Records');
        expect(links[6]).toHaveAccessibleName('Connections');
    });

    /* The two services are independent, so the memory shell carries no route
       back into the agent dashboard — one product's nav does not advertise
       the other's. */
    it('does not link back to the agent dashboard', async () => {
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

        expect(hrefs.some((href) => href?.startsWith('/dashboard'))).toBe(false);
        expect(within(nav).queryByRole('link', { name: /agent dashboard/i })).not.toBeInTheDocument();
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

    /* The hosted memory service and an agent's MEMORY.md workspace are
       different things. Splitting the services must not strip the workspace
       editor out of agent hosting. */
    it('leaves the per-agent workspace editor on the agent dashboard', () => {
        const agentsPage = read('app/dashboard/agents/page.tsx');

        expect(agentsPage).toContain('MemoryEditor');
        // The hosted console's panels are the memory service's, and must not
        // reappear in the agent view.
        expect(agentsPage).not.toContain('MemoryRecordTable');
        expect(agentsPage).not.toContain('MemoryStatsHeader');
    });
});
