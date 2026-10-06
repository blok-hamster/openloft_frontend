import Link from 'next/link';
import { ReactNode } from 'react';
import { Hammer, Database, Github, BookOpen, ArrowRight } from 'lucide-react';
import { isAccountAreaEnabled, FEATURES, FRAMEWORK_REPO } from '@/lib/features';
import styles from './FeatureGate.module.css';

/**
 * Wraps the account area — sign up, sign in, onboarding, dashboard,
 * enterprise — and renders a pre-launch notice instead while the hosted
 * products are dark.
 *
 * Rendered rather than redirected on purpose: a redirect loop gives the
 * visitor no explanation, and a hard 404 looks like a broken deploy. The
 * framework is the product right now, so the notice points at the docs and
 * the repository rather than at a dead-end.
 *
 * This gate is viewport-independent — see the note in lib/features.ts. The
 * same markup renders at 320px and at 1440px, so mobile and desktop cannot
 * drift apart.
 *
 * No 'use client': the component uses no hooks or state, so it can wrap
 * either a server or a client component.
 */
export default function FeatureGate({ children }: { children: ReactNode }) {
    if (isAccountAreaEnabled()) return <>{children}</>;

    return (
        <div className={styles.gate}>
            <div className={styles.gateCard}>
                <p className={styles.gateEyebrow}>Under construction</p>
                <h1 className={styles.gateTitle}>The hosted platform is not open yet</h1>

                <p className={styles.gateBody}>
                    Signing in is switched off while the hosted tier finishes building. Nothing is
                    lost — the memory framework itself is ready, open source, and usable today
                    without an account.
                </p>

                <ul className={styles.gateList}>
                    <li className={styles.gateItem}>
                        <Hammer size={16} aria-hidden className={styles.gateIcon} />
                        <span>
                            <strong>Hosted harness</strong> — running and operating agents for
                            customers. <span className={styles.gateState}>In progress</span>
                        </span>
                    </li>
                    <li className={styles.gateItem}>
                        <Database size={16} aria-hidden className={styles.gateIcon} />
                        <span>
                            <strong>Hosted memory</strong> — the managed, VPC and on-premise tiers.{' '}
                            <span className={styles.gateState}>In progress</span>
                        </span>
                    </li>
                </ul>

                <p className={styles.gateAvailable}>
                    <strong>Available now:</strong> the NMAFC framework — Apache-2.0, runs on your
                    own infrastructure, no account required.
                </p>

                <div className={styles.gateActions}>
                    <Link href="/docs" className="btn-primary">
                        <BookOpen size={14} aria-hidden />
                        Read the docs
                    </Link>
                    <a href={FRAMEWORK_REPO} target="_blank" rel="noreferrer noopener" className="btn-secondary">
                        <Github size={14} aria-hidden />
                        Star on GitHub
                    </a>
                    <Link href="/products" className={styles.gateTertiary}>
                        What is coming <ArrowRight size={14} aria-hidden />
                    </Link>
                </div>
            </div>
        </div>
    );
}

/** Flags, exported so callers can render tailored copy without re-reading env. */
export { FEATURES };
