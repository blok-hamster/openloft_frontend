import Link from 'next/link';
import { ArrowRight, Check, Clock, Server } from 'lucide-react';
import styles from './HostedMemoryBand.module.css';
import { isAccountAreaEnabled } from '@/lib/features';

type Status = 'live' | 'committed';

/**
 * The hosted memory tier.
 *
 * Two things in this band and they are not the same thing, which the layout is
 * meant to make obvious:
 *
 *   The OSS framework        you run it. Free. GitHub.
 *   Hosted memory (here)      we run it. The multi-tenant service in
 *                             `backend/memory-service` is real and deployed —
 *                             tenant isolation bound to a credential, bounded
 *                             per-tenant resources, no vector database to
 *                             provision.
 *
 * Sovereign deployment formats sit in the same band because they are the same
 * product bought differently, and because enterprise buyers ask for all three
 * in the first conversation.
 *
 * Status is honest per item, not aspirational. SSO, the audit trail and the
 * sovereign formats are committed and not shipped; the managed multi-tenant
 * service is shipped. Per MEMORY_PLATFORM_IMPLEMENTATION_PLAN.md M6.2, a
 * capability badge may not claim a control that is still pending, because this
 * page is an external claim surface.
 */

const FORMATS: Array<{
    name: string;
    blurb: string;
    status: Status;
    points: string[];
}> = [
    {
        name: 'Managed',
        blurb: 'Multi-tenant, run by us. One key per tenant, isolated by construction.',
        status: 'live',
        points: [
            'Live today on our infrastructure',
            'No vector database to provision',
            'Bring your own LLM key, or use platform credits',
            'Local embedding option so content stays in-region',
        ],
    },
    {
        name: 'Your VPC',
        blurb: 'Managed Helm charts for EKS, GKE and AKS, in your cloud account.',
        status: 'committed',
        points: ['Committed', 'Your network, your account', 'Same engine, same build'],
    },
    {
        name: 'On-premise',
        blurb: 'A container bundle running next to your own inference — vLLM, Ollama.',
        status: 'committed',
        points: ['Committed', 'Nothing leaves the building', 'Air-gap installable'],
    },
    {
        name: 'Air-gapped / classified',
        blurb: 'Zero network egress. Local embeddings, local models, offline bundle.',
        status: 'committed',
        points: ['Committed', 'Verified no-egress build', 'For defence and regulated work'],
    },
];

const CONTROLS = [
    { label: 'Tenant isolation by credential', state: 'live' as Status },
    { label: 'Bounded per-tenant resources', state: 'live' as Status },
    { label: 'SSO / OIDC and role-based access', state: 'committed' as Status },
    { label: 'Access audit log with actor identity', state: 'committed' as Status },
    { label: 'Right-to-erasure with certificate', state: 'committed' as Status },
    { label: 'Support SLA and named engineer', state: 'committed' as Status },
];

export default function HostedMemoryBand() {
    const accountEnabled = isAccountAreaEnabled();
    return (
        <section className={styles.band} id="hosted-memory">
            <div className={styles.container}>
                <h2 className={styles.title}>Or we run the memory itself</h2>
                <p className={styles.lede}>
                    Same engine, operated by us. The framework is free and open
                    source — this is the tier where we provision, secure, monitor and
                    support the memory layer for your agents, and the tier where it
                    runs inside your own perimeter.
                </p>

                <div className={styles.grid}>
                    {FORMATS.map((f) => (
                        <div
                            key={f.name}
                            className={f.status === 'live' ? styles.cardLive : styles.card}
                        >
                            <div className={styles.cardHead}>
                                <Server size={15} aria-hidden className={styles.cardIcon} />
                                <h3 className={styles.cardName}>{f.name}</h3>
                                <Badge status={f.status} />
                            </div>
                            <p className={styles.cardBlurb}>{f.blurb}</p>
                            <ul className={styles.points}>
                                {f.points.map((pt) => (
                                    <li key={pt}>{pt}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className={styles.controls}>
                    <p className={styles.controlsTitle}>Enterprise controls — current state</p>
                    <ul className={styles.controlList}>
                        {CONTROLS.map((c) => (
                            <li key={c.label}>
                                <Badge status={c.state} bare />
                                <span>{c.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className={styles.actions}>
                    <Link href="/auth/register" className={styles.primary}>
                        Start on managed memory
                        <ArrowRight size={15} aria-hidden />
                    </Link>
                    <Link href="/docs#overview" className={styles.secondary}>
                        Read the docs
                    </Link>
                </div>
            </div>
        </section>
    );
}

function Badge({ status, bare = false }: { status: Status; bare?: boolean }) {
    const live = status === 'live';
    const Icon = live ? Check : Clock;

    if (bare) {
        return (
            <span
                className={live ? styles.dotLive : styles.dotCommitted}
                title={live ? 'Shipped' : 'Committed, not yet shipped'}
            >
                <Icon size={10} aria-hidden />
                <span className={bare ? styles.dotLabel : undefined}>
                    {live ? 'Live' : 'Committed'}
                </span>
            </span>
        );
    }

    return (
        <span className={live ? styles.badgeLive : styles.badgeCommitted}>
            <Icon size={10} aria-hidden />
            {live ? 'Available' : 'Committed'}
        </span>
    );
}