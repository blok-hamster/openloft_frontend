import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/**
 * Guards against a defect class this codebase had repeatedly: a class name
 * referenced from a component but never defined in its CSS module. TypeScript
 * and ESLint both pass on these, and the element simply renders unstyled
 * (class="undefined"). Several shipped this way — `featureList`,
 * `featureItem`, `ctaSection`, `calloutBody`, `authSubtitle`, `planIcon`,
 * `planName`, `currentPlanBtn`, and the whole `app/skills` set.
 *
 * CSS-module `composes` only works at the top level of a file, so this also
 * fails if a `composes` is nested inside an @media block — which only the
 * Turbopack build catches, and which the CI build step now covers.
 */

function resolveCss(spec: string, fromFile: string): string | null {
    const full = spec.startsWith('@/')
        ? path.join(ROOT, spec.slice(2))
        : path.resolve(path.dirname(fromFile), spec);
    return existsSync(full) ? full : null;
}

/** Class names declared by a rule's selector list. Handles selectors
 *  spread across several lines, e.g.
 *      .card,
 *      .cardLive { ... }
 *  where a naive "last line only" parse would miss `.card`. */
function definedClasses(css: string): Set<string> {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const out = new Set<string>();

    let depth = 0;
    let buf = '';

    for (const line of stripped.split('\n')) {
        const opens = (line.match(/\{/g) ?? []).length;
        const closes = (line.match(/\}/g) ?? []).length;

        if (depth === 0 && opens > 0) {
            const selector = buf + line.slice(0, line.indexOf('{'));
            if (!selector.trim().startsWith('@')) {
                for (const part of selector.split(',')) {
                    const first = part.trim().split(/\s+/)[0] ?? '';
                    const cls = first.match(/^\.([A-Za-z][A-Za-z0-9_-]*)$/);
                    if (cls) out.add(cls[1]);
                }
            }
            buf = '';
        } else if (depth === 0) {
            buf += line + '\n';
        }

        depth += opens - closes;
        if (depth < 0) depth = 0;
    }

    return out;
}

/** `globSync` is not in @types/node 20, so walk the tree instead. */
function walk(dir: string, ext: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, ext, acc);
        } else if (entry.name.endsWith(ext)) {
            acc.push(full);
        }
    }
    return acc;
}

function sourceFiles(): string[] {
    return ['app', 'components', 'lib'].flatMap((dir) => walk(path.join(ROOT, dir), '.tsx'));
}

function moduleFiles(): string[] {
    return ['app', 'components', 'lib'].flatMap((dir) => walk(path.join(ROOT, dir), '.module.css'));
}

describe('CSS module integrity', () => {
    const files = sourceFiles();

    it('finds source files to check', () => {
        expect(files.length).toBeGreaterThan(40);
    });

    it.each(files.map((f) => path.relative(ROOT, f)))('%s references only defined classes', (rel: string) => {
        const file = path.join(ROOT, rel);
        const src = readFileSync(file, 'utf8');
        const problems: string[] = [];

        for (const match of src.matchAll(/import (\w+) from '([^']+\.module\.css)'/g)) {
            const [, alias, spec] = match;
            const cssPath = resolveCss(spec, file);

            if (!cssPath) {
                problems.push(`cannot resolve ${spec}`);
                continue;
            }

            const defined = definedClasses(readFileSync(cssPath, 'utf8'));
            const used = new Set<string>();
            // Only `alias.foo` occurrences that follow a non-identifier
            // character, so arrow-function parameters named `e` do not match.
            const re = new RegExp(`(?<![\\w$])${alias}\\.([A-Za-z][A-Za-z0-9_]*)`, 'g');
            for (const m of src.matchAll(re)) used.add(m[1]);

            for (const cls of used) {
                if (!defined.has(cls)) problems.push(`${spec} does not define .${cls}`);
            }
        }

        expect(problems).toEqual([]);
    });

    it.each(moduleFiles().map((f) => path.relative(ROOT, f)))(
        '%s only uses composes at the top level',
        (rel: string) => {
            const css = readFileSync(path.join(ROOT, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
            const problems: string[] = [];

            let depth = 0;
            let mediaDepth: number | null = null;

            for (const line of css.split('\n')) {
                const trimmed = line.trim();
                if (/^@media/.test(trimmed)) mediaDepth = depth;
                if (/composes\s*:/.test(trimmed) && mediaDepth !== null) {
                    problems.push('composes inside @media');
                }
                depth += (trimmed.match(/\{/g) ?? []).length - (trimmed.match(/\}/g) ?? []).length;
                if (depth <= 0) {
                    depth = 0;
                    mediaDepth = null;
                }
            }

            expect(problems).toEqual([]);
        }
    );
});
