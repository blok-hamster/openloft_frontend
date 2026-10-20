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

/* ---------------------------------------------------------------------------
   Mobile optimization plan — Phase 1 contracts. Each test pins a defect the
   device matrix caught live: an error toast burying the bottom bar's primary
   action, iOS zooming on the playground composer, a graph canvas that ate
   page scroll and offered ~3px node targets, a lobby room ~124px taller than
   its column, and a connections table clipped off its own page. Same spirit
   as the suites above: verify statically what the device matrix already
   caught, so a refactor cannot quietly regress it.
   --------------------------------------------------------------------------- */

describe('fixed chrome composes on phones', () => {
    it('raises the toast stack above the bottom bar under 900px', () => {
        const ui = stripComments(read('components/ui/UI.module.css'));
        const blocks = [...ui.matchAll(/\.toastContainer\s*\{[^}]*\}/g)].map((m) => m[0]);
        // The offset must be anchored to the bar's 44px buttons, not the raw
        // screen bottom — otherwise an error toast buries "New Agent" for
        // the full length of its TTL.
        expect(
            blocks.some((block) => /bottom:\s*calc\(\s*var\(--touch-target\)\s*\+/.test(block)),
        ).toBe(true);
    });
});

describe('input zoom floor', () => {
    it('raises the playground composer to 16px on phones', () => {
        const views = stripComments(read('app/memory/MemoryViews.module.css'));
        // The composer is the one raw textarea outside the shared Input; at
        // its old 11px face, focusing it zoomed the page on every message.
        expect(views).toMatch(
            /@media\s*\(max-width:\s*900px\)\s*\{[^@]*?\.composerInput\s*\{[^}]*font-size:\s*1rem/,
        );
    });
});

describe('graph canvas on touch', () => {
    const views = stripComments(read('app/memory/MemoryViews.module.css'));

    /** The declaration block of the first rule for a selector. */
    const blockOf = (selector: string) => {
        const idx = views.indexOf(selector);
        expect(idx).toBeGreaterThan(-1);
        return views.slice(views.indexOf('{', idx), views.indexOf('}', idx));
    };

    it('hands vertical page scroll back to the browser on the canvas', () => {
        expect(blockOf('.graphSvg')).toMatch(/touch-action:\s*pan-y/);
    });

    it('keeps node drags owned by the node', () => {
        expect(views).toMatch(
            /\.graphNodeCore,\s*\.graphNodeActive,\s*\.graphNodeEphemeral,\s*\.graphNodeUnknown\s*\{[^}]*touch-action:\s*none/,
        );
    });

    it('enlarges node tap targets beyond the drawn dot', () => {
        expect(views).toMatch(/\.graphNodeHit\s*\{[^}]*fill:\s*transparent/);
        const canvas = read('components/memory/MemoryGraphCanvas.tsx');
        expect(canvas).toMatch(/views\.graphNodeHit/);
        expect(canvas).toMatch(/Math\.max\(r \+ 16, 26\)/);
    });

    it('ships a keyboard-accessible list rendering of the graph', () => {
        // The SVG is role="img" — the list is the only rendering keyboard
        // and screen-reader users can read at all.
        const page = read('app/memory/graph/page.tsx');
        expect(page).toMatch(/aria-label="How to show the graph"/);
        expect(page).toMatch(/aria-pressed=\{viewMode === 'list'\}/);
    });
});

describe('lobby room fills the shell column', () => {
    it('does not fix its own viewport height on top of the shell', () => {
        // The shell already pads its column for the bottom bar; a fixed
        // 100dvh here stacked that clearance twice and sank the composer
        // under the bar.
        const css = stripComments(read('app/dashboard/lobby/[lobbyId]/LobbyRoom.module.css'));
        expect(css).not.toMatch(/height:\s*100vh/);
        expect(css).not.toMatch(/height:\s*100dvh/);
        expect(css).toMatch(/min-height:\s*100%/);
    });
});

describe('memory connections on phones', () => {
    /* The skeleton lives in the shared table pattern; what the connections
       module must still own is the wiring (composes) and its own breakpoint
       switch. */
    const css = stripComments(read('app/memory/connections/Connections.module.css'));
    const pattern = stripComments(read('components/ui/TablePattern.module.css'));

    it('scrolls the table sideways instead of clipping it', () => {
        expect(pattern).toMatch(/\.tableScroll\s*\{[^}]*overflow-x:\s*auto/);
        expect(css).toMatch(/\.tableScroll\s*\{[^}]*composes:\s*tableScroll\s+from/);
    });

    it('swaps the table for cards below 480px', () => {
        expect(pattern).toMatch(/\.cardStack\s*\{[^}]*display:\s*none/);
        expect(css).toMatch(/\.cardStack\s*\{[^}]*composes:\s*cardStack\s+from/);
        expect(css).toMatch(
            /@media\s*\(max-width:\s*480px\)\s*\{[^@]*?\.cardStack\s*\{[^}]*display:\s*flex/,
        );
    });
});

/* ---------------------------------------------------------------------------
   Mobile optimization plan — Phase 3 contracts: the two-breakpoint
   convention, hover-gated pointer feedback, scroller containment, and the
   touch floor on named controls. A fix that regressed live once gets a
   test; a convention that three straggler breakpoints already broke gets a
   scanner.
   --------------------------------------------------------------------------- */

/** Every @media block in a stylesheet, brace-matched, with its query. */
function mediaBlocks(src: string): Array<{ query: string; body: string; start: number; end: number }> {
    const out: Array<{ query: string; body: string; start: number; end: number }> = [];
    const re = /@media\s+([^{]+)\{/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(src))) {
        let depth = 1;
        let j = match.index + match[0].length;
        while (j < src.length && depth > 0) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') depth--;
            j++;
        }
        out.push({
            query: match[1].trim(),
            body: src.slice(match.index + match[0].length, j - 1),
            start: match.index,
            end: j,
        });
    }
    return out;
}

describe('breakpoint convention', () => {
    it('uses only the two layout breakpoints plus whitelisted helpers', () => {
        // 900 is the dashboard/phone cutoff and 480 the small-phone
        // refinement; everything else is a capability query, not a layout
        // line. Admin's old 768 left 761–799px windows with sideways
        // tables and IntegrationGuide's 600 left unreadable code — this
        // is what a new straggler reintroduces.
        const allowed = [
            'max-width: 900px',
            'max-width: 480px',
            'hover: hover',
            'hover: none',
            'prefers-reduced-motion: reduce',
            'forced-colors: active',
            'print',
            'min-width: 560px',
            'orientation: landscape',
        ];
        const offenders: string[] = [];
        for (const { file, css } of allCss()) {
            for (const block of mediaBlocks(stripComments(css))) {
                if (!allowed.some((a) => block.query.includes(a))) {
                    offenders.push(`${path.relative(ROOT, file)}: @media ${block.query}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});

describe('hover discipline', () => {
    it('puts every :hover rule inside a (hover: hover) block', () => {
        // Tapping is not hovering: an ungated lift, tint or opacity sticks
        // to whatever was last touched on a phone and reads as state that
        // no longer exists.
        const offenders: string[] = [];
        for (const { file, css } of allCss()) {
            const src = stripComments(css);
            const gated = mediaBlocks(src).filter((b) =>
                /hover:\s*hover/.test(b.query),
            );
            const hoverRe = /:hover\b/g;
            let hit: RegExpExecArray | null;
            while ((hit = hoverRe.exec(src))) {
                const inside = gated.some((b) => hit!.index >= b.start && hit!.index < b.end);
                if (!inside) {
                    const line = src.slice(0, hit.index).split('\n').length;
                    offenders.push(`${path.relative(ROOT, file)}:${line} — ${src.slice(hit.index, hit.index + 60).split('\n')[0]}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});

describe('inner scrollers are contained', () => {
    it('declares overscroll-behavior: contain on modal bodies, chats, logs and tables', () => {
        // Without it, flinging to the end of an inner scroller drags the
        // page behind the modal — and the under-the-thumb content moves
        // exactly when the user is mid-gesture.
        const ui = stripComments(read('components/ui/UI.module.css'));
        expect(ui).toMatch(/\.modalContent\s*\{[^}]*overscroll-behavior:\s*contain/);

        const dash = stripComments(read('components/dashboard/Dashboard.module.css'));
        for (const cls of ['chatMessages', 'logPane', 'auditPane']) {
            expect(
                dash,
                `.${cls} must contain its overscroll`,
            ).toMatch(new RegExp(`\\.${cls}\\s*\\{[^}]*overscroll-behavior:\\s*contain`));
        }

        expect(
            stripComments(read('components/ui/TablePattern.module.css')),
        ).toMatch(/\.tableScroll\s*\{[^}]*overscroll-behavior:\s*contain/);
        expect(
            stripComments(read('app/memory/MemoryViews.module.css')),
        ).toMatch(/\.chatScroll\s*\{[^}]*overscroll-behavior:\s*contain/);
    });
});

describe('touch floor on named controls', () => {
    // Controls that a real device matrix caught under 30px, now pinned to
    // the same 44px floor every other control gets.
    const cases: Array<[string, string]> = [
        ['app/memory/MemoryViews.module.css', '\\.tabButton'],
        ['components/landing/ProductSections.module.css', '\\.tab\\s*\\{'],
        ['components/memory/IntegrationGuide.module.css', '\\.tab,\\s*\\.tabActive'],
        ['components/dashboard/ProductSwitcher.module.css', '\\.item,\\s*\\.itemActive'],
        ['components/dashboard/TerminalModal.module.css', '\\.reconnect'],
        ['app/docs/Docs.module.css', '\\.copyButton'],
    ];

    it('raises each named control to the 44px floor under 900px', () => {
        const missing: string[] = [];
        for (const [rel, selector] of cases) {
            const src = stripComments(read(rel));
            const raised = mediaBlocks(src).some(
                (b) =>
                    b.query.includes('max-width: 900px') &&
                    new RegExp(selector).test(b.body) &&
                    /min-height:\s*var\(--touch-target\)/.test(b.body),
            );
            if (!raised) missing.push(`${rel}: ${selector}`);
        }
        expect(missing).toEqual([]);
    });
});

/* ---------------------------------------------------------------------------
   Phase 4: one table→cards pattern. Three surfaces (memory records, graph
   list, connections, admin) compose the same skeleton; each surface only
   points the pattern's custom properties at its own palette.
   --------------------------------------------------------------------------- */
describe('shared table pattern (Phase 4)', () => {
    it('declares the skeleton once', () => {
        const pattern = stripComments(read('components/ui/TablePattern.module.css'));
        for (const cls of [
            'tableScroll',
            'cardStack',
            'tableCard',
            'tableCardHead',
            'tableCardBody',
            'tableCardRow',
            'detailActions',
        ]) {
            expect(pattern, `${cls} must exist in the shared pattern`).toMatch(
                new RegExp(`\\.${cls}\\s*\\{`),
            );
        }
    });

    it('is composed — not re-declared — by memory, connections and admin', () => {
        for (const rel of [
            'components/memory/Memory.module.css',
            'app/memory/connections/Connections.module.css',
            'components/admin/Admin.module.css',
        ]) {
            const css = stripComments(read(rel));
            expect(css, `${rel} must compose the shared pattern`).toMatch(
                /composes:\s*tableScroll\s+from\s+'[^']*TablePattern\.module\.css'/,
            );
            expect(css).toMatch(
                /composes:\s*cardStack\s+from\s+'[^']*TablePattern\.module\.css'/,
            );
        }
    });

    it('keeps the first column readable while a wrapped table slides', () => {
        const pattern = stripComments(read('components/ui/TablePattern.module.css'));
        expect(pattern).toMatch(
            /\.stickyFirst th:first-child\s*,\s*\.stickyFirst td:first-child\s*\{[^}]*position:\s*sticky\s*;\s*left:\s*0/,
        );
        // The sticky col repaints on row hover for pointers only — a touch
        // tap would otherwise stick the highlight to the row it hit.
        expect(pattern).toMatch(
            /@media\s*\(max-width:\s*900px\)\s+and\s*\(hover:\s*hover\)\s*\{[^@]*?\.stickyFirst tbody tr:hover td:first-child\s*\{[^}]*background:\s*var\(--table-sticky-hover/,
        );

        for (const rel of [
            'components/memory/Memory.module.css',
            'app/memory/connections/Connections.module.css',
        ]) {
            expect(stripComments(read(rel))).toMatch(
                /\.stickyFirst\s*\{[^}]*composes:\s*stickyFirst\s+from\s+'[^']*TablePattern\.module\.css'/,
            );
        }
        for (const rel of [
            'components/memory/MemoryRecordTable.tsx',
            'app/memory/graph/page.tsx',
            'app/memory/connections/page.tsx',
        ]) {
            expect(read(rel), `${rel} must attach the sticky first column`).toMatch(
                /styles\.stickyFirst/,
            );
        }
    });
});

/* ---------------------------------------------------------------------------
   P5.1 remainder — the general input-zoom scanner. iOS Safari zooms any
   focused field under 16px and the layout follows; zoom is never capped
   (viewport must stay open), so the fix is a font floor on the field
   itself. Selector bodies may name an element directly (`.chatInput
   textarea`) or through class composition; `var()` substitutions resolve
   against the globals `:root` token table with the declared fallback as a
   second resort, and anything still unknown fails the rule — a size the
   scanner cannot prove safe is treated as 14px, the classic offender.
   --------------------------------------------------------------------------- */

/** px value of a font-size expression, or null when unprovable (fails closed). */
function fontSizePx(value: string, tokens: Record<string, number>): number | null {
    const expr = value.trim();
    const varMatch = expr.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/);
    if (varMatch) {
        if (Object.prototype.hasOwnProperty.call(tokens, varMatch[1])) {
            return tokens[varMatch[1]];
        }
        if (varMatch[2] !== undefined) return fontSizePx(varMatch[2], tokens);
        return null;
    }
    const plain = expr.match(/^([0-9.]+)(rem|em|px)$/);
    if (!plain) return null;
    return parseFloat(plain[1]) * (plain[2] === 'px' ? 1 : 16);
}

describe('form fields keep the 16px iOS-zoom floor', () => {
    it('never sizes a form field below 16px in any stylesheet', () => {
        const tokens: Record<string, number> = {};
        for (const m of stripComments(read('app/globals.css')).matchAll(/--([\w-]+):\s*([0-9.]+)(rem|px)/g)) {
            tokens[`--${m[1]}`] = parseFloat(m[2]) * (m[3] === 'px' ? 1 : 16);
        }

        const element = /(?:^|[\s,>+~"'*])(?:input|textarea|select)\b/;
        const offenders: string[] = [];
        for (const { file, css } of allCss()) {
            const src = stripComments(css);
            const rule = /([^{}]+)\{([^{}]*)\}/g;
            let hit: RegExpExecArray | null;
            while ((hit = rule.exec(src)) !== null) {
                const selector = hit[1];
                const body = hit[2];
                if (!element.test(selector)) continue;
                const size = body.match(/(?:^|;)\s*font-size:\s*([^;]*?)(?:;|$)/);
                if (!size) continue;
                const px = fontSizePx(size[1], tokens);
                if (px === null || px < 16) {
                    offenders.push(`${file}: ${selector.trim().replace(/\s+/g, ' ')} -> ${size[1].trim()}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});

