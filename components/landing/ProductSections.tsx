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
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';

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
                <div className={styles.tabInner} role="tablist">
                    {SECTIONS.map((section, i) => {
                        const selected = section.id === active;
                        return (
                            <button
                                key={section.id}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                aria-controls={`panel-${section.id}`}
                                id={`tab-${section.id}`}
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

            <div
                role="tabpanel"
                id={`panel-${active}`}
                aria-labelledby={`tab-${active}`}
                className={styles.panel}
            >
                <Current />
            </div>
        </div>
    );
}