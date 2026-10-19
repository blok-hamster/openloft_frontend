import Link from 'next/link';
import { ArrowRight, Github, Terminal } from 'lucide-react';
import styles from './FrameworkBand.module.css';

const REPO_URL = 'https://github.com/blok-hamster/nmafc';

/**
 * The open-source framework, on the landing page.
 *
 * NMAFC is the product; the agent platform is one client of it. This band exists
 * because /docs alone was undiscoverable — the header linked it as "Docs", one
 * of five items, and the landing page never mentioned the framework at all.
 *
 * The benchmark panel was rewritten after loft_mem/docs/BLUEPRINT_CORRECTIONS.md.
 * It used to argue that absolute scores were more defensible than deltas
 * "because they do not depend on a baseline", and then published a delta
 * against a baseline we picked ourselves three lines below that sentence. Both
 * readings went: a claim has to carry its own n, its p-value and the category
 * we lose, or a technical evaluator finds the omission before we do.
 *
 * What the run actually supports is one strong result, two null or underpowered
 * ones, and one loss. Temporal is the only category whose lead clears
 * significance (McNemar p ≈ 1e-14). Single-hop is +5.3 at p = 0.13 — a null,
 * not a win. Multi-hop is +12.5 at p = 0.0075 but n = 96, below the ~800-question
 * floor our own README and RESEARCH.md say nothing under has survived
 * re-measurement at full scale. On false-premise questions we are 14.6 points
 * behind and the panel says so. All four are on the page.
 *
 * Two further corrections live here rather than in /docs, because a caveat only
 * counts if it is on the surface the claim is made:
 *
 *   The judge  It is our own LLM judge — no reliability data, no human
 *               spot-check, and two contradictory rules for the adversarial
 *               category. "Independent" was never true.
 *   The licence LoCoMo is CC BY-NC 4.0. Attribution and licence identification
 *               are required wherever its numbers appear, so they appear here.
 *
 * Decay and the local-embedding claim are qualified in the copy for the same
 * reason. At the shipped λ = 0.005 a fact needs roughly 460 turns of neglect to
 * demote, so decay is a designed long-horizon mechanism rather than an active
 * one, and RESEARCH.md measures decay-as-signal at −5.3 — negative in every
 * category, not shipped. Local embeddings alone do not keep conversation content
 * in-network, because the extractor still ships turns to the LLM provider; both
 * a local model and a local embedder are required, and the copy now says so.
 */

const INTEGRATIONS: Array<{ name: string; accent?: boolean; caveat?: string }> = [
    { name: 'Python SDK', accent: true },
    { name: 'REST' },
    { name: 'MCP' },
    {
        name: 'OpenAI-compatible',
        // Tool calling is the majority of agent traffic and this endpoint is not
        // safe for it, so the chip carries the qualifier rather than the docs.
        caveat:
            'Chat-completions shape only. The passthrough drops tools and tool_choice, so tool-calling clients will not work against it. Build against MCP or REST.',
    },
];

const RESULTS: Array<{
    label: string;
    n: number;
    value: string;
    detail: string;
    behind?: boolean;
}> = [
    {
        label: 'Temporal',
        n: 321,
        value: '71.7%',
        detail: 'vs 46.1% vanilla RAG · +25.5 · McNemar p ≈ 1e-14',
    },
    {
        label: 'Multi-hop',
        n: 96,
        value: '57.3%',
        detail: 'vs 44.8% · +12.5 · p = 0.0075 · under our 800-question floor',
    },
    {
        label: 'Single-hop',
        n: 281,
        value: '50.9%',
        detail: 'vs 45.6% · +5.3 · p = 0.13 — a null result, not a win',
    },
    {
        label: 'False premise',
        n: 446,
        value: '35.9%',
        detail: 'vs 50.4% · -14.6 — we lose this one, and publish it',
        behind: true,
    },
];

export default function FrameworkBand() {
    return (
        <section className={styles.band} id="framework">
            <div className={styles.container}>
                <div className={styles.grid}>
                    <div>
                        <span className={styles.eyebrow}>
                            <Terminal size={12} aria-hidden />
                            Open source · Apache-2.0
                        </span>

                        <h2 className={styles.title}>
                            NMAFC — memory that outlives the context window
                        </h2>

                        <p className={styles.lede}>
                            Most assistants forget. Not because the model is weak, but
                            because the transcript ran out. NMAFC is an open-source
                            memory layer that compacts every turn into dated atomic
                            facts, ages unused ones on a decay curve set for the long
                            haul — at the shipped λ = 0.005 a fact takes roughly 460
                            turns of neglect to demote, so nothing decays mid-conversation
                            — and gives back a small, precise, source-attributed
                            context, hundreds of sessions later.
                        </p>

                        <p className={styles.body}>
                            It is a Python package with a server attached. Import it, or
                            point an agent at it. No OpenLoft account, no vector
                            database to provision, and no conversation content leaving
                            your network when you run a local model and a local embedder
                            together — the extractor still ships turns to whichever LLM
                            you configure it with. Local embeddings on their own do not
                            close that gap.{' '}
                            <Link href="/docs">Read the docs</Link> for install steps,
                            configuration and the honest limitations.
                        </p>

                        <div className={styles.actions}>
                            <Link href="/docs" className={styles.primary}>
                                Get started
                                <ArrowRight size={15} aria-hidden />
                            </Link>
                            <a
                                href={REPO_URL}
                                target="_blank"
                                rel="noreferrer noopener"
                                className={styles.secondary}
                            >
                                <Github size={15} aria-hidden />
                                Star on GitHub
                            </a>
                        </div>

                        <p className={styles.integrationsLabel}>Four ways to connect</p>
                        <div className={styles.chips}>
                            {INTEGRATIONS.map((i) => (
                                <span
                                    key={i.name}
                                    className={i.accent ? `${styles.chip} ${styles.chipAccent}` : styles.chip}
                                    title={i.caveat}
                                >
                                    {i.name}
                                </span>
                            ))}
                        </div>
                        <p className={styles.integrationsCaveat}>
                            The OpenAI-compatible endpoint mirrors the chat-completions
                            shape but drops <code>tools</code> and <code>tool_choice</code>,
                            so it is not safe for tool-calling clients — most agent
                            harnesses are. Use MCP or REST for those; the routes are in{' '}
                            <Link href="/docs">the docs</Link>.
                        </p>
                    </div>

                    <div className={styles.proof}>
                        <p className={styles.proofTitle}>
                            LoCoMo accuracy · 1,985 paired questions
                        </p>

                        {RESULTS.map((r) => (
                            <div key={r.label} className={styles.statRow}>
                                <div className={styles.stat}>
                                    <span className={styles.statLabel}>
                                        {r.label}
                                        <span className={styles.statN}>n = {r.n}</span>
                                    </span>
                                    <span
                                        className={
                                            r.behind
                                                ? `${styles.statValue} ${styles.statValueBehind}`
                                                : styles.statValue
                                        }
                                    >
                                        {r.value}
                                    </span>
                                </div>
                                <p className={styles.statDetail}>{r.detail}</p>
                            </div>
                        ))}

                        <p className={styles.footnote}>
                            Temporal is the only category whose lead clears significance,
                            and it is listed first for that reason rather than because it
                            is the largest. Scores come from our own LLM judge — no
                            published reliability data and no human spot-check, so do
                            not read &ldquo;independent&rdquo; into this panel. The full table
                            across all five categories, including the two where vanilla
                            RAG wins, is in <Link href="/docs">the docs</Link>, and every
                            figure regenerates from the committed data with{' '}
                            <code>python summarise.py</code>.
                        </p>

                        <p className={styles.licence}>
                            Benchmark: LoCoMo (Maharana et al., ACL 2024), used under its
                            CC BY-NC 4.0 licence — non-commercial. These are research
                            results on an academic benchmark, not a shipping claim about
                            a product evaluation.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}