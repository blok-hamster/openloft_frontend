'use client';

/**
 * Resources.
 *
 * Every card here was a dead `link="#"`, and the content was about the previous
 * product — an "OpenClaw Deployment Guide", "Scaling Agent Communities", "The
 * Future of A2A Economy", "Community Showcases". None of those documents exist.
 *
 * Replaced with links to things that do exist: the docs sections and the
 * repository. No card here promises a whitepaper or a video we have not made.
 *
 * The `/docs#anchor` targets resolve because DocsPage sets `id={section.id}` on
 * each rendered section, so these are real anchors rather than decorative
 * fragments.
 */

import Link from 'next/link';
import {
    BookOpen,
    Boxes,
    Code2,
    Github,
    LineChart,
    Plug,
    Terminal,
} from 'lucide-react';

import Header from '@/components/landing/Header';
import Card from '@/components/ui/Card';
import styles from '@/components/landing/Landing.module.css';
import r from './Resources.module.css';

import { FRAMEWORK_REPO, FRAMEWORK_LICENCE } from '@/lib/features';

const RESOURCES = [
    {
        type: 'Guide',
        title: 'NMAFC documentation',
        description:
            'What the framework does, how it works, and what it does not do. Start here.',
        icon: BookOpen,
        href: '/docs',
    },
    {
        type: 'Quickstart',
        title: 'Install and first turn',
        description:
            'Install the nmafc Python package with pip, construct a memory, process one turn and recall what it kept.',
        icon: Terminal,
        href: '/docs#quickstart',
    },
    {
        type: 'Integration',
        title: 'Harness setup — Hermes & MCP',
        description:
            'Add long-term memory to Hermes Agent via the openloft-memory plugin, or connect Claude Code, Cursor and Codex over MCP.',
        icon: Plug,
        href: '/docs#hermes-plugin',
    },
    {
        type: 'Reference',
        title: 'SDK, REST and API reference',
        description:
            'The Python API, the HTTP endpoints, configuration keys and the full provider list.',
        icon: Code2,
        href: '/docs#api',
    },
    {
        type: 'Benchmarks',
        title: 'LoCoMo results',
        description:
            'Accuracy across the paired LoCoMo evaluation, including context savings, p-values and reproduction commands.',
        icon: LineChart,
        href: '/docs#benchmarks',
    },
    {
        type: 'Source',
        title: 'Repository',
        description:
            `The engine, under ${FRAMEWORK_LICENCE} (free for non-commercial use). Open an issue or read the implementation.`,
        icon: Github,
        href: FRAMEWORK_REPO,
        external: true,
    },
];

export default function ResourcesPage() {
    return (
        <main className={styles.landingPage}>
            <Header />

            <section className={styles.productHero}>
                <div className={styles.container}>
                    <h1 className={styles.heroTitle}>Developer Resources</h1>
                    <p className={styles.heroSubtitle}>
                        Everything needed to run, integrate and evaluate the memory
                        framework. Every link below goes to something that exists.
                    </p>
                </div>
            </section>

            <section className={`${styles.container} ${r.bodySection}`}>
                <div className={styles.pricingGrid}>
                    {RESOURCES.map((res) => {
                        const Icon = res.icon;
                        return (
                            <Card key={res.title} className={`${styles.resourceCard} ${r.resourceCard}`}>
                                <div className={`${styles.featureTag} ${r.resourceTag}`}>{res.type}</div>
                                <div className={r.resourceIcon}>
                                    <Icon size={24} aria-hidden />
                                </div>
                                <h3
                                    className={`${styles.planName} ${r.resourceTitle}`}
                                >
                                    {res.title}
                                </h3>
                                <p className={`${styles.planDesc} ${r.resourceDesc}`}>{res.description}</p>
                                <Link
                                    href={res.href}
                                    className={`${styles.navLink} ${r.resourceCta}`}
                                    {...(res.external
                                        ? { target: '_blank', rel: 'noreferrer noopener' }
                                        : {})}
                                >
                                    {res.external ? 'Open GitHub →' : 'Read more →'}
                                </Link>
                            </Card>
                        );
                    })}
                </div>
            </section>

            <section className={r.footerBand}>
                <div className={`${styles.container} ${r.footerBand}`}>
                    <Boxes size={22} className={r.footerIcon} aria-hidden />
                    <p className={r.footerBody}>
                        Looking to run the memory layer rather than the framework? The{' '}
                        <Link href="/docs#overview" className={r.footerLink}>
                            hosted tiers
                        </Link>{' '}
                        cover managed, VPC, on-premise and air-gapped deployment, with the
                        current state of each enterprise control published alongside.
                    </p>
                </div>
            </section>
        </main>
    );
}