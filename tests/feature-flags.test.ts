import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * The hosted tier is dark while the hosted harness and hosted memory are
 * still in construction. These tests pin the gating logic itself; the
 * route-level wiring is covered by the assertions at the bottom, which
 * check that every gated route actually renders the gate.
 */

const HARNESS = 'NEXT_PUBLIC_FEATURE_HOSTED_HARNESS';
const MEMORY = 'NEXT_PUBLIC_FEATURE_HOSTED_MEMORY';

async function loadFeatures(env: Record<string, string | undefined>) {
    vi.resetModules();
    for (const key of Object.keys(process.env)) {
        if (key.startsWith('NEXT_PUBLIC_FEATURE_')) delete process.env[key];
    }
    for (const [k, v] of Object.entries(env)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
    return import('../lib/features');
}

afterEach(() => {
    for (const key of Object.keys(process.env)) {
        if (key.startsWith('NEXT_PUBLIC_FEATURE_')) delete process.env[key];
    }
});

describe('feature flags default to off', () => {
    it('has both hosted flags false when unset', async () => {
        const { FEATURES } = await loadFeatures({});
        expect(FEATURES.hostedHarness).toBe(false);
        expect(FEATURES.hostedMemory).toBe(false);
    });

    it('treats the framework as the live product', async () => {
        const { isPreLaunch } = await loadFeatures({});
        expect(isPreLaunch()).toBe(true);
    });
});

describe('account area gating', () => {
    it('is closed when both flags are false', async () => {
        const { isAccountAreaEnabled } = await loadFeatures({
            [HARNESS]: 'false',
            [MEMORY]: 'false',
        });
        expect(isAccountAreaEnabled()).toBe(false);
    });

    it('opens when either flag is true', async () => {
        const harnessOnly = await loadFeatures({ [HARNESS]: 'true', [MEMORY]: 'false' });
        expect(harnessOnly.isAccountAreaEnabled()).toBe(true);

        const memoryOnly = await loadFeatures({ [HARNESS]: 'false', [MEMORY]: 'true' });
        expect(memoryOnly.isAccountAreaEnabled()).toBe(true);

        const both = await loadFeatures({ [HARNESS]: 'true', [MEMORY]: 'true' });
        expect(both.isAccountAreaEnabled()).toBe(true);
    });

    it('opens when only one flag is set at all', async () => {
        const { isAccountAreaEnabled } = await loadFeatures({ [HARNESS]: 'true' });
        expect(isAccountAreaEnabled()).toBe(true);
    });
});

describe('flag parsing', () => {
    it.each([
        ['true', true],
        ['TRUE', true],
        ['True', true],
        ['1', true],
        ['yes', true],
        ['on', true],
        ['false', false],
        ['0', false],
        ['no', false],
        ['off', false],
        ['  true  ', true],
    ])('parses %s as %s', async (raw, expected) => {
        const { FEATURES } = await loadFeatures({ [HARNESS]: raw });
        expect(FEATURES.hostedHarness).toBe(expected);
    });

    it('falls back to false on an unrecognised value rather than opening sign-up', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { FEATURES } = await loadFeatures({ [HARNESS]: 'maybe' });
        expect(FEATURES.hostedHarness).toBe(false);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it('treats an empty string as unset', async () => {
        const { FEATURES } = await loadFeatures({ [HARNESS]: '' });
        expect(FEATURES.hostedHarness).toBe(false);
    });
});

describe('gated routes are wired to the gate', () => {
    it.each([
        'app/auth/login/page.tsx',
        'app/auth/register/page.tsx',
        'app/onboarding/page.tsx',
        'app/enterprise/page.tsx',
        'app/enterprise/onboarding/page.tsx',
        // covers every /dashboard/* route in one place
        'app/dashboard/layout.tsx',
    ])('%s renders FeatureGate', (rel) => {
        const src = read(rel);
        expect(src).toContain('FeatureGate');
        expect(src).toMatch(/<FeatureGate>/);
    });

    it('skips the dashboard auth redirect while gated, so the URL does not bounce through /auth/login', () => {
        const src = read('app/dashboard/layout.tsx');
        // The redirect must be short-circuited by the flag, otherwise an
        // anonymous visit to /dashboard changes the URL to /auth/login and
        // still renders the same notice.
        expect(src).toMatch(/if \(!isAccountAreaEnabled\(\)\) return;/);
        expect(src.indexOf('if (!isAccountAreaEnabled()) return;')).toBeLessThan(
            src.indexOf("router.replace('/auth/login')")
        );
    });

    it('has no media query in the gate or flag module — the gate must not vary by viewport', () => {
        for (const rel of ['lib/features.ts', 'components/FeatureGate.tsx']) {
            const src = read(rel);
            expect(src).not.toMatch(/@media|matchMedia|innerWidth|useIsMobile/);
        }
    });

    it('exposes the framework repo for the gate CTAs', async () => {
        const { FRAMEWORK_REPO } = await loadFeatures({});
        expect(FRAMEWORK_REPO).toMatch(/^https:\/\/github\.com\//);
    });
});

describe('FeatureGate rendering', () => {
    /** Env must already be set by the caller; lib/features reads it at
     *  module-evaluation time, so the cache is cleared here and only here. */
    async function renderGate() {
        vi.resetModules();
        const React = await import('react');
        const { render, screen } = await import('@testing-library/react');
        const FeatureGate = (await import('../components/FeatureGate')).default;
        const utils = render(
            React.createElement(FeatureGate, null, React.createElement('p', null, 'ACCOUNT AREA'))
        );
        return { ...utils, screen };
    }

    afterEach(async () => {
        const { cleanup } = await import('@testing-library/react');
        cleanup();
        for (const key of Object.keys(process.env)) {
            if (key.startsWith('NEXT_PUBLIC_FEATURE_')) delete process.env[key];
        }
    });

    it('renders children when the account area is enabled', async () => {
        process.env[HARNESS] = 'true';
        const { screen } = await renderGate();
        expect(screen.getByText('ACCOUNT AREA')).toBeInTheDocument();
        expect(screen.queryByText(/not open yet/i)).not.toBeInTheDocument();
    });

    it('renders the pre-launch notice instead of children when gated', async () => {
        process.env[HARNESS] = 'false';
        process.env[MEMORY] = 'false';
        const { screen } = await renderGate();
        expect(screen.queryByText('ACCOUNT AREA')).not.toBeInTheDocument();
        expect(screen.getByText(/not open yet/i)).toBeInTheDocument();
    });

    it('always offers a route to the open-source framework while gated', async () => {
        const { screen } = await renderGate();
        expect(screen.getByRole('link', { name: /read the docs/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /star on github/i })).toBeInTheDocument();
        expect(screen.getByText(/apache-2\.0/i)).toBeInTheDocument();
    });

    it('names both unbuilt features in the notice', async () => {
        const { screen } = await renderGate();
        expect(screen.getByText(/hosted harness/i)).toBeInTheDocument();
        expect(screen.getByText(/hosted memory/i)).toBeInTheDocument();
    });
});
