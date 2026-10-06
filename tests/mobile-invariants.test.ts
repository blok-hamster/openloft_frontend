import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/**
 * Mobile invariants. These encode the checks from the device matrix that
 * can be verified statically — the rest need real hardware.
 *
 * Each one corresponds to a defect that was live before this work:
 * - 100vh with no dvh sibling: mobile browser chrome ate ~120px of page
 * - a viewport `maximum-scale`: breaks pinch-zoom accessibility
 * - `viewportFit` absent: `env(safe-area-inset-*)` always resolves to 0,
 *   silently disabling every safe-area rule in the stylesheets
 */

function read(rel: string) {
    return readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Comments legitimately mention the very things these tests forbid. */
function stripComments(src: string) {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function allCss(): { file: string; css: string }[] {
    const found: { file: string; css: string }[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.css')) found.push({ file: full, css: readFileSync(full, 'utf8') });
        }
    };
    walk(path.join(ROOT, 'app'));
    walk(path.join(ROOT, 'components'));
    return found;
}

describe('mobile viewport', () => {
    const layout = stripComments(read('app/layout.tsx'));

    it('exports a viewport', () => {
        expect(layout).toMatch(/export const viewport\s*:/);
    });

    it('never caps zoom with maximumScale', () => {
        expect(layout).not.toMatch(/maximumScale|maximum-scale/);
    });

    it('never disables pinch-zoom with userScalable: false', () => {
        expect(layout).not.toMatch(/userScalable\s*:\s*false/);
    });

    it('sets viewportFit: cover so safe-area insets resolve', () => {
        // Without this, env(safe-area-inset-*) is 0 on every device and
        // every safe-area rule in the stylesheets is dead.
        expect(layout).toMatch(/viewportFit\s*:\s*['"]cover['"]/);
    });
});

describe('dynamic viewport units', () => {
    it('never uses 100vh without a 100dvh sibling', () => {
        const offenders: string[] = [];

        for (const { file, css } of allCss()) {
            const lines = css.split('\n');
            lines.forEach((line, i) => {
                if (!/:\s*100vh\s*;/.test(line)) return;
                const next = lines[i + 1] ?? '';
                if (!/:\s*100dvh\s*;/.test(next)) {
                    offenders.push(`${path.relative(ROOT, file)}:${i + 1}`);
                }
            });
        }

        expect(offenders).toEqual([]);
    });
});

describe('reduced motion', () => {
    const globals = stripComments(read('app/globals.css'));

    it('honours prefers-reduced-motion globally', () => {
        expect(globals).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    });
});

describe('touch target floor', () => {
    it('defines a 44px target token', () => {
        const globals = stripComments(read('app/globals.css'));
        expect(globals).toMatch(/--touch-target:\s*44px/);
    });

    it('raises global pill buttons to the 44px floor on small viewports', () => {
        const globals = stripComments(read('app/globals.css'));
        const small = globals.slice(globals.indexOf('@media (max-width: 900px)'));
        expect(small).toMatch(/min-height:\s*var\(--touch-target\)/);
    });
});

describe('safe areas', () => {
    it('defines the four inset tokens', () => {
        const globals = stripComments(read('app/globals.css'));
        for (const side of ['top', 'right', 'bottom', 'left']) {
            expect(globals).toContain(`--safe-${side}: env(safe-area-inset-${side}, 0px)`);
        }
    });
});
