'use client';

import Header from '@/components/landing/Header';
import styles from '@/components/landing/Landing.module.css';
import { Search } from 'lucide-react';

export default function DocsPage() {
    return (
        <main className={styles.landingPage}>
            <Header />
            
            <section className={styles.productHero} style={{ paddingBottom: '40px' }}>
                <div className={styles.container}>
                    <h1 className={styles.heroTitle}>Documentation</h1>
                    <p className={styles.heroSubtitle}>API references, architecture deep-dives, and SDK documentation.</p>
                    
                    <div style={{ maxWidth: '600px', margin: '3rem auto 0', position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <input 
                            type="text" 
                            placeholder="Search documentation..." 
                            style={{ 
                                width: '100%', 
                                padding: '1rem 1rem 1rem 3rem', 
                                background: 'rgba(26, 26, 26, 0.03)', 
                                border: 'var(--border)', 
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.875rem'
                            }} 
                        />
                    </div>
                </div>
            </section>

            <section className={styles.container} style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '4rem', paddingBottom: '100px' }}>
                <aside className={styles.docsSidebar}>
                    <div className={styles.docsNavGroup}>
                        <h4 className={styles.docsNavTitle}>Getting Started</h4>
                        <ul className={styles.docsNavList}>
                            <li className={styles.docsNavItemActive}>Introduction</li>
                            <li className={styles.docsNavItem}>Quickstart</li>
                            <li className={styles.docsNavItem}>Core Concepts</li>
                        </ul>
                    </div>
                    <div className={styles.docsNavGroup}>
                        <h4 className={styles.docsNavTitle}>Architecture</h4>
                        <ul className={styles.docsNavList}>
                            <li className={styles.docsNavItem}>OpenClaw Runtimes</li>
                            <li className={styles.docsNavItem}>Redis Streams RPC</li>
                            <li className={styles.docsNavItem}>LLM Proxy Layer</li>
                        </ul>
                    </div>
                    <div className={styles.docsNavGroup}>
                        <h4 className={styles.docsNavTitle}>API Reference</h4>
                        <ul className={styles.docsNavList}>
                            <li className={styles.docsNavItem}>Agent Management</li>
                            <li className={styles.docsNavItem}>Usage & Billing</li>
                            <li className={styles.docsNavItem}>Skills Registry</li>
                        </ul>
                    </div>
                </aside>

                <article className={styles.docsBody}>
                    <h2 className={styles.featureTitle}>Introduction</h2>
                    <p className={styles.featureDesc}>
                        OpenLoft is a next-generation orchestration platform for autonomous AI agents. Unlike simple chat interfaces, OpenLoft provides the industrial-grade infrastructure required to run long-lived, goal-oriented agents that can interact with the web, other agents, and external APIs.
                    </p>
                    
                    <h3 style={{ margin: '2rem 0 1rem', textTransform: 'uppercase', fontSize: '1.1rem' }}>The OpenClaw Foundation</h3>
                    <p className={styles.featureDesc}>
                        Every agent on OpenLoft runs inside a dedicated OpenClaw container. OpenClaw is our secure, high-performance runtime optimized for agentic workloads, featuring:
                    </p>
                    <ul className={styles.featureList} style={{ marginTop: '1rem' }}>
                        <li className={styles.featureItem}><strong>Hot-Load Bridge:</strong> Real-time dependency injection.</li>
                        <li className={styles.featureItem}><strong>Drive-Cache Daemon:</strong> Sub-millisecond persistent memory access.</li>
                        <li className={styles.featureItem}><strong>Redis-RPC:</strong> High-throughput communication between the manager and worker.</li>
                    </ul>

                    <div style={{ background: 'var(--off-black)', color: 'white', padding: '1.5rem', borderRadius: '12px', marginTop: '2rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        <span style={{ color: '#888' }}># Install the OpenLoft CLI</span><br/>
                        npm install -g @openloft/cli<br/><br/>
                        <span style={{ color: '#888' }}># Provision a new agent</span><br/>
                        loft deploy --template openclaw-v1
                    </div>
                </article>
            </section>
        </main>
    );
}
