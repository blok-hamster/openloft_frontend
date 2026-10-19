import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import path from 'node:path';

import ProductSections from '@/components/landing/ProductSections';

const ROOT = process.cwd();

// `act` is used outside @testing-library/react's render, which does not set
// this on its own.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The product switcher, two defects deep.
 *
 * 1. It declared `role="tablist"` / `role="tab"` and shipped none of the APG
 *    keyboard contract that goes with those roles — no arrow keys, no Home/End,
 *    no roving tabindex, no `aria-orientation`, and a `role="tabpanel"` with no
 *    `tabIndex`. Screen reader users were promised a widget that did not exist,
 *    inside a `<nav>` that had already announced itself as a landmark. The tabs
 *    are toggle buttons now (`aria-pressed`), which is what they always did.
 *
 * 2. Arriving on a hash deep link server-rendered the default section, then
 *    swapped in the one asked for after hydration — a flash of the wrong
 *    product on the first screen a visitor ever sees. The server cannot see the
 *    hash, so the resolution has to happen before first paint: an inline
 *    bootstrap in `app/layout.tsx` parks it on `<html>`, and the stylesheet
 *    holds the switcher until React has committed the section it names.
 *
 * The second fix is spread over three files that must agree on one attribute
 * name, which is exactly the sort of thing that drifts, so both halves are
 * asserted here.
 */

function read(rel: string): string {
    return readFileSync(path.join(ROOT, rel), 'utf8');
}

/** The dataset key all three halves of the hold have to agree on. */
const HOLD = 'productSection';
/** The attribute name CSS sees for it: dataset camelCase, attribute kebab. */
const ATTR = `data-${HOLD.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

function tabs() {
    return screen.getAllByRole('button');
}

describe('product section switcher', () => {
    beforeEach(() => {
        // jsdom does not implement scrollTo, and select() calls it.
        window.scrollTo = () => {};
        window.location.hash = '';
    });

    it('renders the section the hash names', () => {
        window.location.hash = '#hosted-memory';
        render(<ProductSections />);

        expect(screen.getByRole('heading', { name: 'Or we run the memory itself' })).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: /memory that outlives the context window/i }),
        ).not.toBeInTheDocument();
    });

    it('falls back to the default section for an unrecognised hash', () => {
        window.location.hash = '#pricing';
        render(<ProductSections />);

        expect(
            screen.getByRole('heading', { name: /memory that outlives the context window/i }),
        ).toBeInTheDocument();
    });

    it('exposes the tabs as toggle buttons, not an unimplemented tablist', () => {
        window.location.hash = '#hosted-memory';
        render(<ProductSections />);

        // The contract the old roles implied, none of which is implemented:
        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
        expect(screen.queryAllByRole('tab')).toHaveLength(0);
        expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();

        // What the buttons actually do, stated honestly.
        const [framework, agents, hosted] = tabs();
        expect(framework).toHaveAccessibleName(/The Framework/);
        expect(framework).toHaveAttribute('aria-pressed', 'false');
        expect(agents).toHaveAttribute('aria-pressed', 'false');
        expect(hosted).toHaveAttribute('aria-pressed', 'true');

        // A roving tabindex would have left only one tab reachable by Tab.
        // Pressed state carries the selection, so there is no reason to.
        for (const tab of tabs()) {
            expect(tab).not.toHaveAttribute('tabindex');
        }
    });

    it('switches section, hash and pressed state together', async () => {
        render(<ProductSections />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Agent Hosting/ }));
            // jsdom does not fire hashchange on its own.
            window.dispatchEvent(new Event('hashchange'));
        });

        expect(window.location.hash).toBe('#agents');
        expect(screen.getByRole('heading', { name: 'We host the agents' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Agent Hosting/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('keeps every tab in the tab order', () => {
        render(<ProductSections />);
        expect(tabs()).toHaveLength(3);
    });
});

describe('deep-link hold', () => {
    beforeEach(() => {
        window.scrollTo = () => {};
        window.location.hash = '';
        delete document.documentElement.dataset.productSection;
    });

    it('never reveals the hold before the section it names is on screen', async () => {
        // The real path rather than an assertion about the source: render the
        // page the way Next.js does, run the bootstrap the way app/layout.tsx
        // does, then hydrate. A MutationObserver records the order the DOM was
        // actually touched, so what is asserted is what a visitor would have
        // seen — the stale band, the correct band, and the hold lifting.
        window.location.hash = '#hosted-memory';

        const container = document.createElement('div');
        document.body.appendChild(container);
        const served = renderToString(<ProductSections />);
        container.innerHTML = served;
        document.documentElement.dataset.productSection = window.location.hash.slice(1);

        expect(served).toContain('memory that outlives the context window');

        const touched: string[] = [];
        const observer = new MutationObserver((records) => {
            for (const record of records) {
                if (record.type === 'attributes') {
                    touched.push(`hold:${document.documentElement.dataset.productSection ?? 'released'}`);
                } else {
                    touched.push(`band:${container.querySelector('h2')?.textContent ?? ''}`);
                }
            }
        });
        observer.observe(container, { childList: true, subtree: true, characterData: true });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-product-section'],
        });

        await act(async () => {
            hydrateRoot(container, <ProductSections />);
            // The re-render that resolves the hash is scheduled off the
            // hydration commit, not from it, so give the scheduler its turn
            // inside act rather than after it.
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        // MutationObserver callbacks are microtasks.
        await act(async () => {});
        observer.disconnect();
        document.body.removeChild(container);

        // The section the hash names is the one on screen.
        expect(container.querySelector('h2')?.textContent).toBe('Or we run the memory itself');

        // And the hold lifted only once it was. Everything before the lift is
        // DOM the stylesheet was holding out of sight; the lift is last, so
        // the stale band never had a visible frame.
        const lift = touched.lastIndexOf('hold:released');
        expect(lift).toBeGreaterThan(-1);
        expect(lift).toBe(touched.length - 1);
        expect(touched.slice(0, lift).some((e) => e.startsWith('band:'))).toBe(true);
    });

    it('parks the hash on <html> before first paint', () => {
        const layout = read('app/layout.tsx');

        // Inline and earlier in the body than the content it protects, so the
        // browser has not parsed — let alone painted — the wrong band yet.
        expect(layout).toMatch(/<script/);
        expect(layout).toMatch(/id="product-section-bootstrap"/);
        expect(layout).toMatch(new RegExp(`dataset\\.${HOLD}\\s*=`));
        expect(layout).toMatch(/location\.hash/);
    });

    it('holds the switcher on that attribute, reserving its space', () => {
        const css = read('components/landing/ProductSections.module.css');

        expect(css).toMatch(new RegExp(`html\\[${ATTR}\\]\\s+\\.wrap`));
        // `display` would collapse the band and jump the page; `visibility`
        // keeps the layout.
        expect(css).toMatch(/visibility:\s*hidden/);
    });

    it('is released by the component that knows the section is on screen', () => {
        const tsx = read('components/landing/ProductSections.tsx');

        expect(tsx).toMatch(new RegExp(`delete document\\.documentElement\\.dataset\\.${HOLD}`));
        // Released in a layout effect: a passive one runs after the browser has
        // already painted.
        expect(tsx).toMatch(/useLayoutEffect\(/);
    });
});

describe('mobile tab padding', () => {
    const css = read('components/landing/ProductSections.module.css');

    /** The rules inside the @media block starting at `breakpoint`. */
    function blockAt(breakpoint: string): string {
        const start = css.indexOf(`@media (max-width: ${breakpoint})`);
        expect(start).toBeGreaterThan(-1);

        // Brace-counted, so a rule's own closing brace does not end the block.
        let depth = 0;
        for (let i = start; i < css.length; i++) {
            if (css[i] === '{') depth++;
            else if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
        }
        return '';
    }

    it('steps the tabs at the site 900px breakpoint', () => {
        expect(blockAt('900px')).toMatch(/\.tab\s*\{/);
    });

    it('steps the tabs at the site 480px breakpoint', () => {
        // The bands step at both rungs; the tabs were the only thing without
        // the second one.
        expect(blockAt('480px')).toMatch(/\.tab\s*\{/);
    });
});
