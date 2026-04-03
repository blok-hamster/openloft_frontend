'use client';

import Header from '@/components/landing/Header';
import styles from '@/components/landing/Landing.module.css';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Zap, Shield, Crown, Check } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
    const plans = [
        {
            id: 'hobby',
            name: 'Hobby',
            price: '$0',
            description: 'For experimentation and small projects.',
            features: ['1 Agent', 'Platform Credits Only', 'Public Community Skills', 'Standard Support', 'Shared Infrastructure'],
            icon: <Zap size={32} />,
            color: 'var(--mid-grey)'
        },
        {
            id: 'pro',
            name: 'Professional',
            price: '$49',
            period: '/mo',
            description: 'Powerful AI for growing teams.',
            features: ['5 Agents', 'Bring Your Own Key (BYOK)', 'S3 Persistent Memory', 'Priority Support', 'Automatic Recovery', 'Custom Plugins'],
            icon: <Shield size={32} />,
            color: 'var(--accent-blue)',
            popular: true
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 'Custom',
            description: 'Scalable infrastructure for large swarms.',
            features: ['Unlimited Agents', 'Dedicated Cluster', 'Advanced Security', 'Dedicated Account Manager', 'SLA Guarantee', 'Custom Model Fine-tuning'],
            icon: <Crown size={32} />,
            color: '#a855f7'
        }
    ];

    return (
        <main className={styles.landingPage}>
            <Header />
            
            <section className={styles.pricingHero}>
                <div className={styles.container}>
                    <h1 className={styles.heroTitle}>Simple, Transparent Pricing</h1>
                    <p className={styles.heroSubtitle}>Choose the perfect plan for your autonomous agent orchestration needs.</p>
                </div>
            </section>

            <section className={styles.pricingGridSection}>
                <div className={styles.container}>
                    <div className={styles.pricingGrid}>
                        {plans.map((plan) => (
                            <Card key={plan.id} className={plan.popular ? styles.popularPlan : ''}>
                                {plan.popular && <div className={styles.popularBadge}>Most Popular</div>}
                                <div className={styles.planHeader}>
                                    <div className={styles.planIcon} style={{ color: plan.color }}>{plan.icon}</div>
                                    <h2 className={styles.planName}>{plan.name}</h2>
                                    <div className={styles.planPrice}>
                                        <span className={styles.priceAmount}>{plan.price}</span>
                                        {plan.period && <span className={styles.pricePeriod}>{plan.period}</span>}
                                    </div>
                                    <p className={styles.planDesc}>{plan.description}</p>
                                </div>
                                
                                <div className={styles.planFeatures}>
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className={styles.featureItem}>
                                            <Check size={16} className={styles.checkIcon} />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.planAction}>
                                    <Link href="/auth/register" style={{ width: '100%', display: 'block' }}>
                                        <Button variant={plan.popular ? 'primary' : 'secondary'} fullWidth>
                                            Get Started
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.faqSection}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
                    <div className={styles.faqGrid}>
                        <div className={styles.faqItem}>
                            <h3>What are Platform Credits?</h3>
                            <p>Platform credits allow you to use our managed LLM keys (OpenAI, Anthropic, etc.) without having your own API accounts. We handle the billing and provide a transparent proxy.</p>
                        </div>
                        <div className={styles.faqItem}>
                            <h3>How does BYOK work?</h3>
                            <p>On the Pro plan, you can "Bring Your Own Key". This routes agent requests directly to your own provider accounts, so you only pay us for the orchestration platform.</p>
                        </div>
                        <div className={styles.faqItem}>
                            <h3>Can I upgrade later?</h3>
                            <p>Yes, you can upgrade or downgrade your plan at any time from your dashboard. Changes are applied immediately.</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
