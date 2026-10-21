import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Graph canvas gesture contract — the pinch/pan second pass.
 *
 * The first pass (touch-action pan-y on the svg, invisible hit circles,
 * graph⇄list toggle) deliberately deferred two-finger zoom. Shipping it
 * without bowing to the geometry cost the first pass called out: every
 * pointer conversion must run the viewBox scale AND then invert the
 * canvas transform. These pins hold that contract.
 */

const ROOT = process.cwd();

const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('graph canvas gestures', () => {
    const src = stripComments(read('components/memory/MemoryGraphCanvas.tsx'));

    it('draws everything inside one transform group', () => {
        expect(src).toMatch(/<g transform=\{`translate/);
    });

    it('inverts the zoom transform in the drag conversion', () => {
        // The regression this pins: the first pass multiplied by the viewBox
        // scale only, which is correct at k=1 and increasingly wrong as the
        // canvas zooms — dragged nodes drifted away from the finger.
        expect(src).toMatch(/\(view\.x - t\.x\) \/ t\.k/);
        expect(src).toMatch(/\(view\.y - t\.y\) \/ t\.k/);
    });

    it('zooms on the wheel only when the platform-pinch flag is set', () => {
        // Trackpad pinch emits wheel events with ctrlKey set; plain wheel
        // over the graph must stay page scrolling.
        expect(src).toMatch(/passive:\s*false/);
        expect(src).toMatch(/!event\.ctrlKey && !event\.metaKey/);
    });

    it('keeps the fitted view scroll-friendly and takes over when zoomed', () => {
        expect(src).toMatch(/touchAction = k > 1 \? 'none' : ''/);
    });

    it('bounds the zoom and re-clamps the pan', () => {
        expect(src).toMatch(/ZOOM_MIN = 1/);
        expect(src).toMatch(/ZOOM_MAX = 3\.5/);
        expect(src).toMatch(/clampPan/);
    });

    it('offers a keyboard/pointer-chip zoom bar with 44px floors', () => {
        expect(src).toMatch(/aria-label="Zoom in"/);
        expect(src).toMatch(/aria-label="Zoom out"/);
        expect(src).toMatch(/aria-label="Reset zoom"/);

        const css = stripComments(read('app/memory/MemoryViews.module.css'));
        expect(css).toMatch(/\.graphZoomBtn\s*\{[^}]*min-height:\s*var\(--touch-target\)/);
    });

    it('makes nodes keyboard controls rather than pointer-only shapes', () => {
        // M2: the canvas promised "select a node" but only a pointer could.
        // Nodes are buttons in the tab order and Enter/Space selects them;
        // the svg is a labelled group so role="img" cannot flatten them.
        expect(src).toMatch(/role="group"/);
        expect(src).toMatch(/role=\{node && onSelect \? 'button' : undefined\}/);
        expect(src).toMatch(/tabIndex=\{node && onSelect \? 0 : undefined\}/);
        expect(src).toMatch(/event\.key === 'Enter' \|\| event\.key === ' '/);
    });

    it('does not lose the tap-to-select contract', () => {
        // dragMovedRef still shields the click that follows a drag; pin it
        // so a gesture refactor cannot re-select nodes the user moved.
        expect(src).toMatch(/dragMovedRef\.current\s*=\s*false/);
        expect(src).toMatch(/if \(dragMovedRef\.current\)/);
    });
});
