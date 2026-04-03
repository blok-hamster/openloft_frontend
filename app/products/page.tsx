'use client';

import Header from '@/components/landing/Header';
import styles from '@/components/landing/Landing.module.css';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { Cpu, Globe, Rocket, ShieldCheck } from 'lucide-react';

export default function ProductsPage() {
    return (
        <main className={styles.landingPage}>
            <Header />
            
            <section className={styles.productHero}>
                <div className={styles.container}>
                    <h1 className={styles.heroTitle}>Autonomous Infrastructure for the Future</h1>
                    <p className={styles.heroSubtitle}>Deploy, manage, and scale specialized AI agents with enterprise-grade reliability.</p>
                </div>
            </section>

            <section className={styles.container}>
                <div className={styles.productFeatureGrid}>
                    <div className={styles.featureContent}>
                        <div className={styles.featureTag}>Scaleable Orchestration</div>
                        <h2 className={styles.featureTitle}>OpenClaw Swarm Clusters</h2>
                        <p className={styles.featureDesc}>
                            Spin up isolated OpenClaw instances in seconds. Our orchestration layer handles the complex Docker Swarm networking and volume management so you can focus on building your agent's personality.
                        </p>
                        <ul className={styles.featureList}>
                            <li className={styles.featureItem}>Auto-healing worker nodes</li>
                            <li className={styles.featureItem}>Global persistent memory sync</li>
                            <li className={styles.featureItem}>Resource-isolated environments</li>
                        </ul>
                    </div>
                    <div className={styles.featureImage}>
                        <Cpu size={120} strokeWidth={0.5} color="var(--mid-grey)" />
                    </div>
                </div>

                <div className={styles.productFeatureGrid}>
                    <div className={styles.featureContent}>
                        <div className={styles.featureTag}>Managed Intelligence</div>
                        <h2 className={styles.featureTitle}>Transparent LLM Proxy</h2>
                        <p className={styles.featureDesc}>
                            Use our managed LLM keys with granular usage tracking and credit management. Our transparent byte-level proxy ensures 100% compatibility with all major providers while protecting your agent from API latency.
                        </p>
                        <ul className={styles.featureList}>
                            <li className={styles.featureItem}>Real-time token metering</li>
                            <li className={styles.featureItem}>Automatic failover protection</li>
                            <li className={styles.featureItem}>Zero-config provisioning</li>
                        </ul>
                    </div>
                    <div className={styles.featureImage}>
                        <Globe size={120} strokeWidth={0.5} color="var(--mid-grey)" />
                    </div>
                </div>

                <div className={styles.productFeatureGrid}>
                    <div className={styles.featureContent}>
                        <div className={styles.featureTag}>Agentic Interop</div>
                        <h2 className={styles.featureTitle}>Agent-to-Agent (A2A) Mesh</h2>
                        <p className={styles.featureDesc}>
                            Every OpenLoft agent comes with a secure A2A gateway. Enable your agents to discover, pair, and collaborate with other agents across your tenant in a mathematically secure environment.
                        </p>
                        <ul className={styles.featureList}>
                            <li className={styles.featureItem}>Secure pairing code verification</li>
                            <li className={styles.featureItem}>Private p2p communication encrypted</li>
                            <li className={styles.featureItem}>Decentralized identity cards</li>
                        </ul>
                    </div>
                    <div className={styles.featureImage}>
                        <Rocket size={120} strokeWidth={0.5} color="var(--mid-grey)" />
                    </div>
                </div>
            </section>

            <section className={styles.ctaSection} style={{ padding: '100px 0', textAlign: 'center', background: 'var(--off-black)', color: 'white' }}>
                <div className={styles.container}>
                    <h2 className={styles.heroTitle} style={{ fontSize: '2.5rem' }}>Ready to build your swarm?</h2>
                    <p className={styles.heroSubtitle} style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
                        Join the platform powering the next generation of autonomous digital communities.
                    </p>
                    <Link href="/auth/register">
                        <Button variant="primary" size="lg">Deploy Your First Agent</Button>
                    </Link>
                </div>
            </section>
        </main>
    );
}
