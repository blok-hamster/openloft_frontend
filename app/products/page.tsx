'use client';

/**
 * Products.
 *
 * Was three agent-orchestration rows — OpenClaw swarm clusters, the LLM proxy,
 * and an A2A mesh — under a "build your swarm" pitch. None of it mentioned the
 * framework, which is now the product. Rewritten to mirror the three landing
 * sections so the two pages tell the same story.
 *
 * One row is kept that is not one of the three: the metered LLM proxy. It is
 * real, it is separately billed as platform credits, and dropping it would hide
 * a working feature. It sits last as a supporting capability rather than a
 * headline product.
 *
 * Claims are held to what exists. Agent types are marked the same way the
 * landing page marks them: two deployable today, four announced. The old copy
 * claimed "Global persistent memory sync" under swarm clusters — that was S3
 * file mirroring inside a container, not the memory layer, and it is now the
 * first row with the correct description.
 */

import Link from 'next/link';
import { Brain, Cpu, Globe, Server } from 'lucide-react';

import Header from '@/components/landing/Header';
import Button from '@/components/ui/Button';
import styles from '@/components/landing/Landing.module.css';
import pr from './Products.module.css';
import { isAccountAreaEnabled, FRAMEWORK_REPO } from '@/lib/features';

const PRODUCTS = [
    {
        tag: 'Open source · Apache-2.0',
        title: 'NMAFC Memory Framework',
        icon: Brain,
        desc: 'An open-source memory layer for LLM agents. It compacts each turn into dated atomic facts, lets unused facts fade on a decay curve, and retrieves through a fusion of five ranked channels — so context stays small no matter how long the conversation gets.',
        items: [
            'Temporal grounding: relative dates resolved at write time',
            'Three memory types with different decay rates',
            'Source attribution back to the originating turns',
            'No external vector database required',
        ],
        href: '/docs',
        cta: 'Read the docs',
    },
    {
        tag: 'Hosted agents',
        title: 'Agent Hosting',
        icon: Cpu,
        desc: 'Pick a harness and we provision it, run it, give it a subdomain and wire it to the same memory. OpenClaw and Hermes are available today; Claude Code, OpenCode, Codex and Gemini CLI are announced.',
        items: [
            'OpenClaw and Hermes available now',
            'Claude Code, OpenCode, Codex, Gemini CLI announced',
            'Desktop editors connect over MCP instead',
            'Swap harnesses without losing what was learned',
        ],
        href: '/docs#mcp',
        cta: 'Harness setup',
    },
    {
        tag: 'Enterprise · managed or sovereign',
        title: 'Hosted Memory Service',
        icon: Server,
        desc: 'The same engine, operated by us. Multi-tenant and isolated by credential on our infrastructure, or deployed into your own VPC, on-premise, or air-gapped. You bring an API key; we bring the operations.',
        items: [
            'Managed multi-tenant available today',
            'Your VPC, on-premise and air-gapped committed',
            'Local embeddings so content stays in-region',
            'Enterprise controls published with current state',
        ],
        href: '/docs#overview',
        cta: 'See the tiers',
    },
];

const SUPPORTING = {
    tag: 'Supporting capability',
    title: 'Metered LLM Access',
    icon: Globe,
    desc: 'Use our model keys with per-request metering, or bring your own. The same proxy fronts every major provider, so switching costs nothing. Platform credits are billed against a credit balance that floors at zero rather than going negative.',
    items: [
        'Real-time token metering',
        'Credit balance with a hard floor',
        'Bring-your-own-key supported',
    ],
};

export default function ProductsPage() {
  const accountEnabled = isAccountAreaEnabled();
    return (
        <main className={styles.landingPage}>
            <Header />

            <section className={styles.productHero}>
                <div className={styles.container}>
                    <h1 className={styles.heroTitle}>Three products, one engine</h1>
                    <p className={styles.heroSubtitle}>
                        Run the memory framework yourself, let us host your agents, or
                        let us run the memory layer entirely. Every path uses the same
                        open-source build.
                    </p>
                </div>
            </section>

            <section className={styles.container}>
                {PRODUCTS.map((product) => {
                    const Icon = product.icon;
                    return (
                        <div key={product.title} className={styles.productFeatureGrid}>
                            <div className={styles.featureContent}>
                                <div className={styles.featureTag}>{product.tag}</div>
                                <h2 className={styles.featureTitle}>{product.title}</h2>
                                <p className={styles.featureDesc}>{product.desc}</p>
                                <ul className={pr.featureList}>
                                    {product.items.map((item) => (
                                        <li key={item} className={pr.featureItem}>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={product.href}
                                    className={`${styles.navLink} ${pr.featureCta}`}
                                >
                                    {product.cta} →
                                </Link>
                            </div>
                            <div className={styles.featureImage}>
                                <Icon size={120} strokeWidth={0.5} color="var(--mid-grey)" />
                            </div>
                        </div>
                    );
                })}

                <div className={styles.productFeatureGrid}>
                    <div className={styles.featureContent}>
                        <div className={styles.featureTag}>{SUPPORTING.tag}</div>
                        <h2 className={styles.featureTitle}>{SUPPORTING.title}</h2>
                        <p className={styles.featureDesc}>{SUPPORTING.desc}</p>
                        <ul className={pr.featureList}>
                            {SUPPORTING.items.map((item) => (
                                <li key={item} className={pr.featureItem}>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className={styles.featureImage}>
                        <Globe size={120} strokeWidth={0.5} color="var(--mid-grey)" />
                    </div>
                </div>
            </section>

            <section className={pr.ctaBand}>
                <div className={styles.container}>
                    <h2 className={`${styles.heroTitle} ${pr.ctaTitle}`}>
                        Start with the framework
                    </h2>
                    <p
                        className={`${styles.heroSubtitle} ${pr.ctaBody}`}
                    >
                        It is free and open source. Host an agent or the memory layer
                        only when you want us to operate it.
                    </p>
                    <div className={pr.ctaActions}>
                        <Link href="/docs">
                            <Button variant="primary" size="lg">
                                Read the docs
                            </Button>
                        </Link>
                        {accountEnabled ? (
                            <Link href="/auth/register">
                                <Button variant="secondary" size="lg">
                                    Get started
                                </Button>
                            </Link>
                        ) : (
                            <a href={FRAMEWORK_REPO} target="_blank" rel="noreferrer noopener">
                                <Button variant="secondary" size="lg">
                                    Get the framework
                                </Button>
                            </a>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}