import Link from 'next/link';
import { ArrowRight, Github, Terminal } from 'lucide-react';
import { FRAMEWORK_REPO, FRAMEWORK_LICENCE } from '@/lib/features';
import styles from './FrameworkBand.module.css';

/**
 * The NMAFC framework, on the landing page.
 *
 * NMAFC is the product; the agent platform is one client of it. This band exists
 * because /docs alone was undiscoverable — the header linked it as "Docs", one
 * of five items, and the landing page never mentioned the framework at all.
 *
 * The benchmark panel mirrors `nmafc/README.md` ("Where it stands"): the paired
 * run across LoCoMo's four standard scored categories (n = 1,539, matching
 * published LoCoMo comparisons such as Mem0/Zep/MemMachine) alongside the 34%
 * reduction in mean prompt context tokens. Full 5-category data including
 * adversarial, single-hop, open-domain, and latency lives in `/docs#benchmarks`.
 */

const INTEGRATIONS: Array<{ name: string; accent?: boolean; caveat?: string }> = [
    { name: 'Python SDK', accent: true },
    { name: 'REST' },
    { name: 'MCP' },
    { name: 'Hermes plugin' },
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
}> = [
    {
        label: 'Scored core (4 categories)',
        n: 1539,
        value: '71.4%',
        detail: 'vs 64.6% vanilla RAG · +6.8 pts · McNemar p = 5.5e-08',
    },
    {
        label: 'Temporal',
        n: 321,
        value: '71.7%',
        detail: 'vs 46.1% vanilla RAG · +25.5 pts · McNemar p = 1.1e-14',
    },
    {
        label: 'Multi-hop',
        n: 96,
        value: '57.3%',
        detail: 'vs 44.8% vanilla RAG · +12.5 pts · McNemar p = 0.0075',
    },
    {
        label: 'Prompt context (mean)',
        n: 1985,
        value: '963 t',
        detail: 'vs 1,461 t vanilla RAG · −34% tokens per question',
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
                            Source-available · {FRAMEWORK_LICENCE}
                        </span>

                        <h2 className={styles.title}>
                            NMAFC — memory that outlives the context window
                        </h2>

                        <p className={styles.lede}>
                            Most assistants forget. Not because the model is weak, but
                            because the transcript ran out. NMAFC is a stateful memory
                            layer that compacts every turn into dated atomic facts, ages
                            unused ones on a decay curve set for the long haul — at the
                            shipped λ = 0.005 a fact takes roughly 460 turns of neglect
                            to demote, so nothing decays mid-conversation — and gives back
                            a small, precise, source-attributed context, hundreds of
                            sessions later.
                        </p>

                        <p className={styles.body}>
                            Install it into any Python 3.11–3.13 project with{' '}
                            <code>pip install &quot;nmafc[llm]&quot;</code>, or wire an
                            agent to it over MCP, REST, or the Hermes plugin. No OpenLoft
                            account, no vector database to provision, and no conversation
                            content leaving your network when you run a local model and a
                            local embedder together — the extractor still ships turns to
                            whichever LLM you configure it with, so local embeddings on
                            their own do not keep content in-network.{' '}
                            <Link href="/docs">Read the docs</Link> for install steps,
                            configuration and limitations.
                        </p>

                        <div className={styles.actions}>
                            <Link href="/docs" className={styles.primary}>
                                Get started
                                <ArrowRight size={15} aria-hidden />
                            </Link>
                            <a
                                href={FRAMEWORK_REPO}
                                target="_blank"
                                rel="noreferrer noopener"
                                className={styles.secondary}
                            >
                                <Github size={15} aria-hidden />
                                Star on GitHub
                            </a>
                        </div>

                        <p className={styles.integrationsLabel}>Five ways to connect</p>
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
                            harnesses are. Use MCP, REST, or the{' '}
                            <Link href="/docs#hermes-plugin">Hermes plugin</Link> for those.
                        </p>
                    </div>

                    <div className={styles.proof}>
                        <p className={styles.proofTitle}>
                            LoCoMo accuracy · 1,539 scored questions
                        </p>

                        {RESULTS.map((r) => (
                            <div key={r.label} className={styles.statRow}>
                                <div className={styles.stat}>
                                    <span className={styles.statLabel}>
                                        {r.label}
                                        <span className={styles.statN}>n = {r.n.toLocaleString()}</span>
                                    </span>
                                    <span className={styles.statValue}>
                                        {r.value}
                                    </span>
                                </div>
                                <p className={styles.statDetail}>{r.detail}</p>
                            </div>
                        ))}

                        <p className={styles.footnote}>
                            Both arms answered in the same execution window against the
                            same persisted stores (McNemar exact test, LLM-as-judge). The
                            four scored categories match published LoCoMo evaluations and
                            lead vanilla RAG by +6.8 points while spending 34% fewer
                            context tokens. The complete five-category table and
                            reproduction instructions (<code>nmafc eval locomo regenerate</code>{' '}
                            / <code>summarise.py</code>) live in{' '}
                            <Link href="/docs#benchmarks">the docs</Link>.
                        </p>

                        <p className={styles.licence}>
                            Benchmark: LoCoMo (Maharana et al., ACL 2024), used under its
                            CC BY-NC 4.0 licence (non-commercial). Software: NMAFC is
                            free for non-commercial use under {FRAMEWORK_LICENCE}.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}