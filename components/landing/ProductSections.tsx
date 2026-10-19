'use client';

/**
 * Product section switcher.
 *
 * Three products, three sections, one landing page. This replaced a single
 * 3,500px scroll in which all three bands stacked — a visitor could not tell
 * where one product ended and the next began, and nothing was linkable.
 *
 * Routing is hash-based (`#framework`, `#agents`, `#hosted-memory`) rather than
 * three separate routes. That keeps the pitch and the products on one URL, which
 * is what a landing page is for, while making each section linkable and making
 * browser back/forward behave.
 *
 * Only the active section is mounted, not hidden with CSS. Three mounted panels
 * would duplicate the `id` attributes the bands use as anchors, which is invalid
 * HTML and would break the in-page deep links from the copy ("setup is one
 * config block" points at /docs, and the bands are the targets of #framework
 * and friends).
 *
 * Arriving on a deep link used to flash the wrong product. The server has no URL
 * hash — it is never sent in the request — so server-rendering could only ever
 * paint the default section, and the one the visitor asked for landed a frame
 * later. The bootstrap script in app/layout.tsx therefore parks the hash on
 * `<html>` before first paint, and `.wrap` stays hidden while it is there. Only
 * this component can clear it, because only this component knows the section the
 * hash names is the section now on screen; see the layout effect below.
 *
 * The tabs are toggle buttons rather than an ARIA tablist — see the note at the
 * markup.
 */

import { useCallback, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';

import FrameworkBand from './FrameworkBand';
import HarnessBand from './HarnessBand';
import HostedMemoryBand from './HostedMemoryBand';
import styles from './ProductSections.module.css';

const SECTIONS = [
    { id: 'framework', label: 'The Framework', Component: FrameworkBand },
    { id: 'agents', label: 'Agent Hosting', Component: HarnessBand },
    { id: 'hosted-memory', label: 'Hosted Memory', Component: HostedMemoryBand },
] as const;

const IDS = SECTIONS.map((s) => s.id) as unknown as string[];
const DEFAULT = 'framework';

function readHash(): string {
    if (typeof window === 'undefined') return DEFAULT;
    // Strip a leading "#" and any trailing slash/whitespace.
    const raw = window.location.hash.replace(/^#/, '').trim();
    return IDS.includes(raw) ? raw : DEFAULT;
}

export default function ProductSections() {
    // The URL hash is an external store, so it is read as one.
    // useSyncExternalStore rather than useState + useEffect: the server has no
    // window, so reading the hash during render would hydrate differently from
    // what it served, and mirroring it into state inside an effect produces a
    // cascading render for what is already a subscription.
    const subscribe = useCallback((onChange: () => void) => {
        window.addEventListener('hashchange', onChange);
        return () => window.removeEventListener('hashchange', onChange);
    }, []);

    const active = useSyncExternalStore(subscribe, readHash, () => DEFAULT);

    // Release the pre-hydration hold described in the header. A layout effect,
    // not a passive one: a passive effect runs after the browser has already
    // painted, which would show a frame of nothing with nothing to gain from it.
    useLayoutEffect(() => {
        // Reconciled against the URL rather than against `active` alone. An
        // unrecognised hash resolves to DEFAULT, so `active` never changes for
        // one and a hold keyed on `active` would never be released at all.
        if (readHash() !== active) return;
        delete document.documentElement.dataset.productSection;
    }, [active]);

    const select = useCallback((id: string) => {
        // Assigning the hash pushes a history entry, so Back returns to the
        // previous section rather than leaving the page.
        if (window.location.hash.replace(/^#/, '') !== id) {
            window.location.hash = id;
        }
        // The tab bar is sticky, so a bare anchor jump would tuck the section
        // title underneath it.
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const Current = useMemo(
        () => SECTIONS.find((s) => s.id === active)?.Component ?? FrameworkBand,
        [active],
    );

    return (
        <div className={styles.wrap}>
            <nav className={styles.tabBar} aria-label="Product sections">
                {/* Toggle buttons, not a tablist.

                    The roles said role="tablist"/role="tab" and meant it, which
                    is a contract: arrow keys, a roving tabindex, an
                    aria-orientation and a focusable tabpanel. None of it was
                    implemented, so a screen reader user was told "tab 1 of 3"
                    and handed something that answered only to Tab and Enter —
                    and the whole widget sat inside a <nav>, which already
                    announces itself as a landmark. aria-pressed states what
                    these buttons actually do (press one, it becomes the section
                    on screen), leaves every promise it makes a kept one, and
                    keeps all three in the tab order, which a roving tabindex
                    would have taken away. */}
                <div className={styles.tabInner}>
                    {SECTIONS.map((section, i) => {
                        const selected = section.id === active;
                        return (
                            <button
                                key={section.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => select(section.id)}
                                className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
                            >
                                <span className={styles.tabIndex}>
                                    0{i + 1}
                                </span>
                                {section.label}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div className={styles.panel}>
                <Current />
            </div>
        </div>
    );
}
