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
 * Benchmark figures are absolute accuracy on the categories we lead, not
 * deltas against a baseline. Absolute scores are the more defensible claim: a
 * score on a public benchmark can be checked directly, whereas a delta depends
 * on which baseline was chosen.
 *
 * The complete table, including the categories NMAFC does not lead, lives in
 * /docs and the footnote points there. Nothing on this page is inaccurate, and
 * nothing here is the whole picture.
 */
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
                            facts, lets unused ones fade on a decay curve, and gives
                            back a small, precise, source-attributed context — hundreds
                            of sessions later.
                        </p>

                        <p className={styles.body}>
                            It is a Python package with a server attached. Import it, or
                            point an agent at it. No OpenLoft account, no vector
                            database to provision, no data leaving your network if you
                            use local embeddings.{' '}
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
                            <span className={`${styles.chip} ${styles.chipAccent}`}>
                                Python SDK
                            </span>
                            <span className={styles.chip}>REST</span>
                            <span className={styles.chip}>MCP</span>
                            <span className={styles.chip}>OpenAI-compatible</span>
                        </div>
                    </div>

                    <div className={styles.proof}>
                        <p className={styles.proofTitle}>
                            Accuracy on LoCoMo question categories
                        </p>

                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Temporal</span>
                            <span className={styles.statValue}>71.7%</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Single-hop</span>
                            <span className={styles.statValue}>50.9%</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Multi-hop</span>
                            <span className={styles.statValue}>57.3%</span>
                        </div>

                        <p className={styles.footnote}>
                            Scored by an independent LLM judge on the LoCoMo benchmark,
                            against a vanilla RAG baseline of 46.1%, 45.6% and 44.8%
                            respectively. The full table across all five categories —
                            including the ones we do not lead — is in{' '}
                            <Link href="/docs">the docs</Link>, and every figure
                            regenerates from the committed data with{' '}
                            <code>python summarise.py</code>.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}