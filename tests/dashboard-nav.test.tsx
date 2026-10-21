import { render, screen, within, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Dashboard navigation, two defects deep.
 *
 * 1. Memory had no nav entry at all, and the section that had become the
 *    primary offering was not even reachable from the account area. The
 *    landing page says "Memory is what makes an agent an agent"; the
 *    dashboard still landed on Agents and never mentioned memory.
 *
 * 2. The Admin item was gated on `user?.role === 'admin'` (OR a real role).
 *    The backend's enum is 'platform_admin' | 'tenant_admin' | 'tenant_user',
 *    so the bare 'admin' string matched nobody — and where it was the only
 *    comparison, the link never rendered for anyone, including the admins
 *    who need /admin. TypeScript cannot catch this: the role arrives as a
 *    plain string from the API.
 *
 * The nav itself is asserted through the rendered layout rather than through
 * the source, because the ordering and the gating are both render-time
 * behaviour — a source check would still pass if the array were reordered
 * or the condition inverted further down the component.
 *
 * Memory no longer lives here at all: the hosted memory service is an
 * independent product with its own dashboard at /memory, and these tests
 * keep it out of the agent sidebar.
 */

const ROOT = process.cwd();

const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

/** Both must agree with the backend enum in backend/src/models/User.ts. */
const authState = vi.hoisted(() => ({
    user: {
        role: 'platform_admin',
        tenantId: 'tenant-1',
        email: 'admin@example.com',
    } as { role: string; tenantId: string; email: string },
}));

const PLATFORM_ADMIN = { role: 'platform_admin', tenantId: 'tenant-1', email: 'admin@example.com' };
const TENANT_USER = { role: 'tenant_user', tenantId: 'tenant-1', email: 'user@example.com' };

/* The highlight tests need to walk the sidebar to different pages, so the
   pathname mock reads a mutable cell (reset in afterEach). */
const navPath = vi.hoisted(() => ({ pathname: '/dashboard/agents' }));

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
    navPath.pathname = '/dashboard/agents';
    delete process.env.NEXT_PUBLIC_FEATURE_HOSTED_HARNESS;
    delete process.env.NEXT_PUBLIC_FEATURE_LOBBY;
});

/**
 * lib/features reads its flags at module-evaluation time and the layout is
 * wrapped in FeatureGate, so the gate has to be open before the module is
 * imported — a layout rendered with the flags dark renders the pre-launch
 * notice instead of the nav. Lobby section flags are set to the open state
 * by default and overridden per test.
 */
async function loadLayout(env: Record<string, string | undefined> = {}) {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_FEATURE_HOSTED_HARNESS;
    delete process.env.NEXT_PUBLIC_FEATURE_LOBBY;
    process.env.NEXT_PUBLIC_FEATURE_HOSTED_HARNESS = 'true';
    process.env.NEXT_PUBLIC_FEATURE_LOBBY = 'true';
    for (const [k, v] of Object.entries(env)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
    return import('../app/dashboard/layout');
}

describe('dashboard nav order', () => {
    it('leads with Agents, the agent dashboard\'s own product', async () => {
        const { navItems } = await loadLayout();

        // Agent hosting is what this shell serves; anything else in it makes
        // the sidebar stand in for a product that has its own dashboard.
        expect(navItems[0].href).toBe('/dashboard');
        expect(navItems[0].label).toBe('Agents');
        expect(navItems[0].icon).toBeTruthy();
    });

    it('keeps the agent sections in their established order', async () => {
        const { navItems } = await loadLayout();

        // Sales Team and Skills came off the sidebar; Lobby is present in
        // this list when its flag is on (loadLayout opens it above).
        expect(navItems.map((i: { label: string }) => i.label)).toEqual([
            'Agents',
            'Lobby',
            'Billing',
            'Settings',
        ]);
    });

    it('carries no removed sections', async () => {
        const { navItems } = await loadLayout();

        // Sales Team and Skills both came off the sidebar. The routes behind
        // them still exist for their deep links; the sidebar just stops
        // advertising them.
        const hrefs = navItems.map((i: { href: string }) => i.href);
        expect(hrefs.some((href: string) => href.startsWith('/dashboard/team'))).toBe(false);
        expect(hrefs.some((href: string) => href.startsWith('/dashboard/skills'))).toBe(false);
    });

    it('gives every entry a unique href', async () => {
        const { navItems } = await loadLayout();

        const hrefs = navItems.map((i: { href: string }) => i.href);
        expect(new Set(hrefs).size).toBe(hrefs.length);
    });

    /* The split this pins: a product's own sidebar carries only its own
       sections. Memory is reachable one click away via the ProductSwitcher
       above the two nav lists — the switch is identity, not section bleed. */
    it('does not carry the hosted memory service', async () => {
        const { navItems } = await loadLayout();

        expect(navItems.some((i: { href: string }) => i.href.startsWith('/memory'))).toBe(false);
        expect(navItems.some((i: { href: string }) => i.href.startsWith('/dashboard/memory'))).toBe(false);
    });

    it('offers the service switcher outside the section nav', async () => {
        const { default: DashboardLayout } = await loadLayout();

        render(
            <DashboardLayout>
                <p>child</p>
            </DashboardLayout>
        );

        const switcher = screen.getByRole('group', { name: 'Switch service' });
        const memory = within(switcher).getByRole('link', { name: 'Memory' });
        expect(memory).toHaveAttribute('href', '/memory');
        // Agents is the product being served, so the switch agrees with the
        // page: the current side is marked, the other side is clickable.
        expect(within(switcher).getByRole('link', { name: 'Agents' })).toHaveAttribute(
            'aria-current',
            'page'
        );
        expect(memory).not.toHaveAttribute('aria-current');
    });

    it('renders Agents as the first link in the sidebar', async () => {
        const { default: DashboardLayout } = await loadLayout();

        render(
            <DashboardLayout>
                <p>child</p>
            </DashboardLayout>
        );

        const nav = screen.getByRole('navigation', { name: 'Dashboard' });
        const links = within(nav).getAllByRole('link');

        expect(links[0]).toHaveAttribute('href', '/dashboard');
        expect(links[0]).toHaveAccessibleName('Agents');
        // Highlighting is derived from the href, so a wrong order here would
        // also mark the wrong item active. Lobby is next when its flag is on.
        expect(links[1]).toHaveAttribute('href', '/dashboard/lobby');
        expect(links[1]).toHaveAccessibleName('Lobby');
        // The memory service is its own dashboard; nothing here points at it.
        expect(links.map((l) => l.getAttribute('href'))).not.toContain('/dashboard/memory');
    });
});

describe('sidebar highlight is a single aria-current (H3)', () => {
    it('waits until only Billing is current on /dashboard/billing', async () => {
        navPath.pathname = '/dashboard/billing';
        const { default: DashboardLayout } = await loadLayout();

        render(
            <DashboardLayout>
                <p>child</p>
            </DashboardLayout>
        );

        const nav = screen.getByRole('navigation', { name: 'Dashboard' });
        const current = within(nav)
            .getAllByRole('link')
            .filter((l) => l.getAttribute('aria-current') === 'page');

        expect(current.map((l) => l.textContent)).toEqual(['Billing']);
    });

    it('marks the section root only on its own page', async () => {
        navPath.pathname = '/dashboard/billing';
        const { default: DashboardLayout } = await loadLayout();

        render(
            <DashboardLayout>
                <p>child</p>
            </DashboardLayout>
        );

        const nav = screen.getByRole('navigation', { name: 'Dashboard' });
        // Agents is the section root: a prefix match would be current on
        // every nested page and double-highlight with whichever section the
        // user actually visited. One current link per pathname, everywhere.
        expect(within(nav).getByRole('link', { name: 'Agents' })).not.toHaveAttribute('aria-current');
        expect(within(nav).getByRole('link', { name: 'Billing' })).toHaveAttribute('aria-current', 'page');
    });

    it('marks the root on its own page', async () => {
        navPath.pathname = '/dashboard';
        const { default: DashboardLayout } = await loadLayout();

        render(
            <DashboardLayout>
                <p>child</p>
            </DashboardLayout>
        );

        const nav = screen.getByRole('navigation', { name: 'Dashboard' });
        expect(
            within(nav)
                .getAllByRole('link')
                .filter((l) => l.getAttribute('aria-current') === 'page')
                .map((l) => l.textContent),
        ).toEqual(['Agents']);
    });
});

describe('lobby nav flag', () => {
    /** The build-time flag must reflect at import time because navItems is
     *  built when the module evaluates. */
    it('omits Lobby from the sidebar while NEXT_PUBLIC_FEATURE_LOBBY is dark', async () => {
        const { default: DashboardLayout } = await loadLayout({ NEXT_PUBLIC_FEATURE_LOBBY: 'false' });

        render(
            <DashboardLayout>
                <p>child</p>
            </DashboardLayout>
        );

        const nav = screen.getByRole('navigation', { name: 'Dashboard' });
        expect(within(nav).queryByRole('link', { name: 'Lobby' })).not.toBeInTheDocument();
        // Sections stay adjacent: the flagged-out entries leave no gaps.
        expect(within(nav).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual([
            '/dashboard',
            '/dashboard/billing',
            '/dashboard/settings',
            '/admin',
        ]);
    });
});

describe('admin nav gate', () => {
    it('shows the Admin link to a platform_admin', async () => {
        const { default: DashboardLayout } = await loadLayout();
        authState.user = PLATFORM_ADMIN;

        render(
            <DashboardLayout>
                <p>child</p>
            </DashboardLayout>
        );

        const nav = screen.getByRole('navigation', { name: 'Dashboard' });
        expect(within(nav).getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    });

    it('hides the Admin link from every other backend role', async () => {
        const { default: DashboardLayout } = await loadLayout();
        authState.user = TENANT_USER;

        render(
            <DashboardLayout>
                <p>child</p>
            </DashboardLayout>
        );

        const nav = screen.getByRole('navigation', { name: 'Dashboard' });
        expect(within(nav).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    });

    it('only ever compares against roles the backend can actually return', async () => {
        const src = read('app/dashboard/layout.tsx');

        // 'admin' is not in the backend enum, so a comparison against it is
        // dead code that quietly disables the link.
        expect(src).not.toMatch(/role\s*===\s*'admin'/);
        expect(src).toMatch(/role\s*===\s*'platform_admin'/);
    });
});

describe('agents route move', () => {
    it('moves the agent view off the dashboard root', async () => {
        const moved = read('app/dashboard/agents/page.tsx');
        const index = read('app/dashboard/page.tsx');

        // The orchestration view — header, list and every modal — lives at
        // /dashboard/agents now, and the root is a server redirect to it, so
        // the post-login redirects in AuthContext and the Hero CTA still land
        // somewhere real without painting a blank frame first.
        expect(moved).toContain('DashboardHeader');
        expect(moved).toContain('AgentList');
        expect(moved).not.toContain('useRouter');
        expect(index).toContain("redirect('/dashboard/agents')");
    });
});
