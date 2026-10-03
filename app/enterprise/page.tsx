'use client';

import Link from 'next/link';
import styles from './Enterprise.module.css';

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: '£300/mo',
    agents: 3,
    bestFor: 'Early-stage startups',
    features: ['Inbound Agent', 'Outbound Agent', 'Content Agent', 'Dedicated VPS', 'Full Onboarding'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '£700/mo',
    agents: 5,
    bestFor: 'Scaling businesses',
    features: ['All Starter agents', 'QA & Editor Agent', 'Lead Nurturing Agent', 'Pipeline Orchestration', 'Weekly Reports'],
  },
  {
    id: 'enterprise_custom',
    name: 'Enterprise',
    price: 'Custom',
    agents: 7,
    bestFor: 'Established organisations',
    features: ['Full 7-agent team', 'Analytics Agent', 'Customer Success Agent', 'Custom Integrations', 'Dedicated Support'],
  },
];

export default function EnterprisePage() {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>AI Sales & Marketing Team</h1>
        <p className={styles.subtitle}>
          A fully deployed, pre-configured AI team — powered by OpenClaw and Hermes Agent, running 24/7 on dedicated infrastructure.
        </p>
        <p className={styles.delivery}>Delivered in 48 hours. From £300/month.</p>
      </div>

      <div className={styles.tierGrid}>
        {tiers.map((tier) => (
          <div key={tier.id} className={styles.tierCard}>
            <h3 className={styles.tierName}>{tier.name}</h3>
            <p className={styles.tierPrice}>{tier.price}</p>
            <p className={styles.tierAgents}>{tier.agents} agents</p>
            <p className={styles.tierBestFor}>{tier.bestFor}</p>
            <ul className={styles.tierFeatures}>
              {tier.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link href={`/enterprise/onboarding?tier=${tier.id}`} className={styles.tierCta}>
              Get Started
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
