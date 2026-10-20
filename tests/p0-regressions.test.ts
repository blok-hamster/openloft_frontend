import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * P0 correctness pins (UI_DEEP_AUDIT.md §9, "P0 — this week").
 *
 * These findings were crashes and false-empty states, not styling opinions.
 * Where the fix is behaviour, it has its own behaviour test
 * (`human-approval-queue.test.tsx`, the nav suites); these source pins
 * cover the fixes whose failure mode is invisible to jsdom — the exact
 * template that crashed billing, the wizard's keyless-BYOK gate, the admin
 * page's gate ordering, the docs toc twin, the global focus ring, and the
 * retired `(user as any)?.token` accessor.
 */

const ROOT = process.cwd();

const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

/** Comments mention the fixed code on purpose; strip them first. */
const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('P0 regressions are pinned at source', () => {
    it('billing never reads the forecast off an unloaded profile (H1)', () => {
        const page = stripComments(read('app/dashboard/billing/page.tsx'));
        // `!== null` was the crash: `undefined !== null` is true, so the
        // true-branch read `billing.estimatedDaysRemaining` on an unloaded
        // profile. Only a null*check* may guard the read now.
        expect(page).toContain('billing?.estimatedDaysRemaining != null');
        expect(page).not.toMatch(/estimatedDaysRemaining\s*(?:!==|===)\s*null/);
        // …and load failure renders a retry state, not a frozen page.
        expect(page).toMatch(/loadError/);
        expect(page).toMatch(/Retry/);
    });

    it('human approvals filter the fetched enum, not a phantom status (H2)', () => {
        const queue = stripComments(read('components/dashboard/HumanApprovalQueue.tsx'));
        expect(queue).toMatch(/l\.status\s*===\s*'pending_human_approval'/);
        expect(queue).not.toMatch(/status\s*===\s*'pending'/);
    });

    it('team pages take the bearer token from the auth context (H5)', () => {
        for (const rel of [
            'app/dashboard/team/page.tsx',
            'app/dashboard/team/analytics/page.tsx',
            'app/dashboard/team/settings/page.tsx',
        ]) {
            const page = stripComments(read(rel));
            // `(user as any)?.token` was always undefined: the token lives
            // BESIDE the user in the auth context, not on the user object —
            // every team request went out as `Bearer undefined`.
            expect(page, rel).not.toMatch(/(user\s+as\s+any[^\n]*)?\.token/);
            expect(page, rel).toMatch(/token \? \{ Authorization: `Bearer \$\{token\}` \} : \{}/);
        }
        // And no file anywhere may resurrect the accessor.
        for (const rel of ['app', 'components']) {
            const found = walk(rel).filter((f) => /Bearer \$\{\(user/.test(read(f)));
            expect(found, `${found.join(', ')} must not read tokens off the user object`).toEqual([]);
        }
        // Failures render as errors, never as the empty state.
        expect(stripComments(read('app/dashboard/team/page.tsx'))).toMatch(/role="alert"/);
    });

    it('the wizard cannot review a BYOK agent with no credential (H6)', () => {
        const wiz = stripComments(read('components/dashboard/AgentCreationWizard.tsx'));
        // "Use Saved Key" can be left selected while the vault has no key;
        // the old gate `!useSavedKey && !customSecret` passed then and sent
        // a keyless deploy. The credential existing is the requirement.
        expect(wiz).toMatch(
            /disabled=\{!model \|\| \(!usePlatformCredits && !hasSavedKeyForProvider && !customSecret\.trim\(\)\)\}/,
        );
        // Provider fetch failures surfaced, not swallowed.
        expect(wiz).not.toMatch(/\.catch\(\(\) => \{\}\)/);
        expect(wiz).toMatch(/provisionError/);
        expect(wiz).toMatch(/loadProvisioning/);
        // The orchestrator stops wiping custom secrets on provider change.
        expect(wiz).toMatch(/setCustomSecret\(''\)/);
    });

    it('admin probes behind the role gate and loads settled (H8)', () => {
        const admin = stripComments(read('app/admin/page.tsx'));
        expect(admin).toMatch(/Promise\.allSettled/);
        expect(admin).toMatch(/if \(!isAdmin\) return;\s*\n?\s*loadData\(\)/);
        // Native confirm() is retired; both destructive actions confirm in-app.
        expect(admin).not.toMatch(/\bconfirm\(/);
        expect(admin).toMatch(/ConfirmDestructiveAction/);
    });

    it('docs render the toc twin on desktop and hide it on phones (H4)', () => {
        const page = read('app/docs/page.tsx');
        expect(page).toMatch(/styles\.tocDesktop/);
        expect(page).toMatch(/aria-label="On this page"/);
        expect(page).toMatch(/styles\.tocMobile/); // the phone collapse stays

        const css = stripComments(read('app/docs/Docs.module.css'));
        // base block owns the desktop default…
        expect(css).toMatch(/\.tocDesktop\s*\{[^}]*display:\s*block/);
        // …and the ≤900 flip: mobile details out, desktop twin dark. The
        // adjacent pair only exists in the mobile block — the base order is
        // the reverse (mobile none, twin block).
        expect(css).toMatch(
            /\.tocMobile\s*\{[^}]*display:\s*block[\s\S]*?\.tocDesktop\s*\{[^}]*display:\s*none/,
        );
    });

    it('keyboard focus has one global ring (H7)', () => {
        const css = stripComments(read('app/globals.css'));
        expect(css).toMatch(
            /button:focus-visible,\s*\n?a:focus-visible,\s*\n?summary:focus-visible\s*\{[^}]*outline-offset:\s*2px/,
        );
    });
});

/* helpers */

function walk(rel: string): string[] {
    const out: string[] = [];
    const walkDir = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            const full = path.join(dir, entry.name);
            if (statSync(full).isDirectory()) walkDir(full);
            else if (/\.(tsx?|ts)$/.test(entry.name)) out.push(relative(full));
        }
    };
    walkDir(path.join(ROOT, rel));
    return out;
}

function relative(full: string): string {
    return path.relative(ROOT, full);
}
