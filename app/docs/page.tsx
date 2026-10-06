'use client';

/**
 * Framework documentation.
 *
 * Replaces a 89-line placeholder whose search box had no handler and whose
 * sidebar items were inert <li> elements. Both now work.
 *
 * Why the content lives in `content.ts`: the search index and the rendered page
 * read from one source, so a section cannot be findable but unreachable, or
 * reachable but unsearchable.
 *
 * Claim discipline: see the header of content.ts. This page states the
 * limitations rather than burying them, because a developer who finds them
 * later stops trusting the whole thing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Search, Terminal } from 'lucide-react';

import Header from '@/components/landing/Header';
import styles from './Docs.module.css';
import { GROUPS, SECTIONS, sectionText, type Block } from './content';

const REPO_URL = 'https://github.com/blok-hamster/nmafc';

const CALLOUT_ICON = {
  note: Info,
  warn: AlertTriangle,
  good: CheckCircle2,
} as const;

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard is blocked in some contexts (insecure origin, denied
      // permission). Leaving the button reading "Copy" is a silent, harmless
      // failure; a false success would be worse.
    }
  }, [code]);

  return (
    <div className={styles.code}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLabel}>{label}</span>
        <button type="button" className={styles.copyButton} onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderBlock(block: Block, key: number) {
  switch (block.t) {
    case 'lead':
      return (
        <p key={key} className={styles.lead}>
          {block.text}
        </p>
      );
    case 'p':
      return (
        <p key={key} className={styles.p}>
          {block.text}
        </p>
      );
    case 'h3':
      return (
        <h3 key={key} className={styles.h3}>
          {block.text}
        </h3>
      );
    case 'list':
      return (
        <ul key={key} className={styles.list}>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'code':
      return <CodeBlock key={key} label={block.label} code={block.code} />;
    case 'table':
      return (
        <div key={key} className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'callout': {
      const Icon = CALLOUT_ICON[block.callout.kind];
      const variant =
        block.callout.kind === 'warn'
          ? styles.calloutWarn
          : block.callout.kind === 'good'
            ? styles.calloutGood
            : styles.calloutNote;
      return (
        <div key={key} className={`${styles.callout} ${variant}`}>
          <Icon size={18} className={styles.calloutIcon} aria-hidden />
          <div className={styles.calloutBody}>
            <p className={styles.calloutTitle}>{block.callout.title}</p>
            <p>{block.callout.body}</p>
          </div>
        </div>
      );
    }
    case 'cards':
      return (
        <div key={key} className={styles.grid}>
          {block.cards.map((card, i) => (
            <div key={i} className={styles.card}>
              <h4 className={styles.cardTitle}>{card.title}</h4>
              <p className={styles.p}>{card.body}</p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export default function DocsPage() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(SECTIONS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const tocRef = useRef<HTMLDetailsElement | null>(null);

  // Precompute the index once. sectionText walks the whole tree, so doing this
  // inside the filter would re-parse ~2,000 lines of content per keystroke.
  const index = useMemo(
    () => SECTIONS.map((s) => ({ id: s.id, label: s.label, group: s.group, text: sectionText(s) })),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    // Every whitespace-separated term must appear somewhere in the section, so
    // adding a word narrows rather than widening the result.
    const terms = q.split(/\s+/);
    return SECTIONS.filter((s) => {
      const hay = index.find((e) => e.id === s.id)?.text ?? '';
      return terms.every((t) => hay.includes(t));
    });
  }, [query, index]);

  const visibleIds = useMemo(() => new Set(filtered.map((s) => s.id)), [filtered]);

  // A filter can hide the section the sidebar is highlighting. Resolving that
  // during render rather than in an effect keeps the highlight and the page in
  // agreement without a second pass.
  const effectiveActive = visibleIds.has(active) ? active : (filtered[0]?.id ?? '');

  // Scrollspy. Sections can be filtered out, so the observer is rebuilt against
  // whichever sections are on screen.
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-doc-section]'),
    ).filter((n) => visibleIds.has(n.dataset.docSection ?? ''));

    observerRef.current?.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit?.target instanceof HTMLElement) {
          setActive(hit.target.dataset.docSection ?? '');
        }
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    );
    nodes.forEach((n) => observer.observe(n));
    observerRef.current = observer;

    return () => observer.disconnect();
  }, [visibleIds]);

  const jump = useCallback((id: string) => {
    const el = document.querySelector<HTMLElement>(`[data-doc-section="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  }, []);

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.heroTitle}>Documentation</h1>
          <p className={styles.heroSubtitle}>
            Everything about the OpenLoft platform: the NMAFC memory framework, the agents we
            host for you, and the hosted memory service. Start with the framework — it is
            open source, so run it yourself with no OpenLoft account required.
          </p>

          <a
            className={styles.repoLink}
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Terminal size={15} aria-hidden />
            github.com/blok-hamster/nmafc
          </a>

          <div className={styles.searchWrap}>
            <Search size={20} className={styles.searchIcon} aria-hidden />
            <input
              className={styles.search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the docs — try &quot;decay&quot;, &quot;mcp&quot;, or &quot;forget&quot;"
              aria-label="Search documentation"
            />
            {query.trim() && (
              <p className={styles.searchCount}>
                {filtered.length} of {SECTIONS.length} sections
              </p>
            )}
          </div>
        </div>
      </section>

      <div className={styles.container}>
        <div className={styles.body}>
          <aside className={styles.sidebar}>
            {/* Uncontrolled so the native <summary> toggle keeps working;
                closed imperatively when a link is tapped. */}
            <details className={styles.tocMobile} ref={tocRef}>
              <summary className={styles.tocSummary}>Contents</summary>
            {GROUPS.map((group) => {
              const items = filtered.filter((s) => s.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className={styles.navGroup}>
                  <h4 className={styles.navTitle}>{group}</h4>
                  {items.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { jump(s.id); if (tocRef.current) tocRef.current.open = false; }}
                      className={`${styles.navItem} ${
                        effectiveActive === s.id ? styles.navItemActive : ''
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              );
            })}
            </details>
          </aside>

          <div className={styles.content}>
            {filtered.length === 0 ? (
              <div className={styles.empty}>
                Nothing matches “{query.trim()}”.
                <br />
                Try a shorter term — or{' '}
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  clear the search
                </button>
                .
              </div>
            ) : (
              filtered.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  data-doc-section={section.id}
                  className={styles.section}
                >
                  <h2 className={styles.h2}>{section.label}</h2>
                  {section.blocks.map(renderBlock)}
                </section>
              ))
            )}
          </div>
        </div>
      </div>

      <footer className={styles.container}>
        <div className={styles.footer}>
          <p>
            NMAFC is open source under Apache-2.0. If you would rather not operate it
            yourself, OpenLoft Memory runs the same engine as a managed, multi-tenant
            service with the tenant bound to a credential, or deployed into your own
            perimeter — see{' '}
            <a className={styles.link} href="#hosted-memory">
              Hosted Memory
            </a>
            .
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            Benchmark figures are from LoCoMo (Maharana et al., 2024), licensed CC BY-NC 4.0.
            Reproduce them with{' '}
            <code className={styles.inlineCode}>
              python scripts/benchmarks/results/paired_2026_09_10/summarise.py
            </code>{' '}
            — no API credentials required.
          </p>
        </div>
      </footer>
    </main>
  );
}