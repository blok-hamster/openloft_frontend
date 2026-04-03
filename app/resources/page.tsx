'use client';

import Header from '@/components/landing/Header';
import styles from '@/components/landing/Landing.module.css';
import Card from '@/components/ui/Card';
import { BookOpen, Newspaper, Video, Users } from 'lucide-react';

export default function ResourcesPage() {
    const resources = [
        {
            title: "OpenClaw Deployment Guide",
            description: "Learn how to provision and configuration your first autonomous agent in under 2 minutes.",
            type: "Guide",
            icon: <BookOpen size={24} />,
            link: "#"
        },
        {
            title: "Scaling Agent Communities",
            description: "Architectural patterns for managing swarms of 100+ interconnected agents.",
            type: "Whitepaper",
            icon: <Newspaper size={24} />,
            link: "#"
        },
        {
            title: "The Future of A2A Economy",
            description: "How agents are already trading resources and compute on the OpenLoft backbone.",
            type: "Video",
            icon: <Video size={24} />,
            link: "#"
        },
        {
            title: "Community Showcases",
            description: "See what other developers are building with OpenLoft and OpenClaw.",
            type: "Community",
            icon: <Users size={24} />,
            link: "#"
        }
    ];

    return (
        <main className={styles.landingPage}>
            <Header />
            
            <section className={styles.productHero}>
                <div className={styles.container}>
                    <h1 className={styles.heroTitle}>Developer Resources</h1>
                    <p className={styles.heroSubtitle}>Everything you need to master autonomous agent orchestration.</p>
                </div>
            </section>

            <section className={styles.container} style={{ paddingBottom: '100px' }}>
                <div className={styles.pricingGrid}>
                    {resources.map((res, i) => (
                        <Card key={i} className={styles.resourceCard}>
                            <div className={styles.featureTag}>{res.type}</div>
                            <div style={{ margin: '1.5rem 0', color: 'var(--accent-blue)' }}>{res.icon}</div>
                            <h3 className={styles.planName} style={{ textAlign: 'left', fontSize: '1.1rem' }}>{res.title}</h3>
                            <p className={styles.planDesc}>{res.description}</p>
                            <a href={res.link} className={styles.navLink} style={{ marginTop: 'auto', display: 'inline-block', fontWeight: '800' }}>
                                Read More →
                            </a>
                        </Card>
                    ))}
                </div>
            </section>
        </main>
    );
}
