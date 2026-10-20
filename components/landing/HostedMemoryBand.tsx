import Link from 'next/link';
import { ArrowRight, Check, Clock, Server, Wrench } from 'lucide-react';
import styles from './HostedMemoryBand.module.css';
import { isAccountAreaEnabled } from '@/lib/features';
import { ProductStatus, STATUS_META, DEPLOYMENT_STATUS } from '@/lib/productStatus';

/**
 * The hosted memory tier.
 *
 * Two things in this band and they are not the same thing, which the layout is
 * meant to make obvious:
 *
 *   The OSS framework        you run it. Free. GitHub.
 *   Hosted memory (here)      we run it. The multi-tenant service in
 *                             `backend/memory-service` is real and tested —
 *                             tenant isolation bound to a credential, bounded
 *                             per-tenant resources, no vector database to
 *                             provision.
 *
 * Sovereign deployment formats sit in the same band because they are the same
 * product bought differently, and because enterprise buyers ask for all three
 * in the first conversation.
 *
 * ---------------------------------------------------------------------------
 * Status vocabulary — four states, and the distinction between the middle two
 * is the whole point of this file.
 *
 *   live        Running, available to a customer today.
 *   built       Implemented and covered by tests in this repo, but not
 *               deployed for customers. This is where the managed memory
 *               service actually is.
 *   committed   Scoped and committed in the plan, no code behind it yet.
 *   announced   Named publicly, nothing at all in the repo.
 *
 * Nothing here is `live`. That is not a hedge, it is the current state:
 *
 *   - `memory-service` is absent from `backend/docker-compose.prod.yml`. It is
 *     in the dev compose file and nowhere else, so no production stack runs it.
 *   - `NMAFC_API_KEYS` and `NMAFC_SERVICE_URL` appear zero times across
 *     `backend/.env`, `.env.prod` and `.env.example`. With them unset,
 *     `MemoryService.ts:82` `requireEnv('NMAFC_SERVICE_URL')` throws, so the
 *     `/api/memory` routes cannot serve a request at all.
 *   - `NEXT_PUBLIC_FEATURE_HOSTED_MEMORY` defaults to `false`, which is this
 *     band's own admission that the tier is not open.
 *
 * The three sovereign formats are `announced`, not `committed`: there is no
 * `backend/charts/`, no air-gap bundle and no on-premise appliance to point at.
 * Per MEMORY_PLATFORM_IMPLEMENTATION_PLAN.md M6.2 and the enterprise tier plan
 * §6, a badge may not claim a control that is still pending, because this page
 * is an external claim surface.
 * ---------------------------------------------------------------------------
 */

const FORMATS: Array<{
    name: string;
    blurb: string;
    status: ProductStatus;
    points: string[];
    note: string;
}> = [
    {
        name: 'Managed',
        blurb: 'Multi-tenant, run by us. One key per tenant, isolated by construction.',
        status: DEPLOYMENT_STATUS.managed,
        points: [
            'No vector database to provision',
            'Bring your own LLM key, or use platform credits',
            'One key per tenant, so an unprovisioned tenant gets a 503 rather than a cross-tenant read',
            'Local embedding option — vectors stay in-region, but conversation turns still reach your LLM provider',
        ],
        note: 'Built and tested, not yet deployed. The last point is the honest limit of the local embedding option: embedding vectors in-region does not keep turn content in-region, because extraction fuses the generation call and the turn text goes to the provider. In-region content requires the air-gapped format below, which does not exist yet.',
    },
    {
        name: 'Your VPC',
        blurb: 'Managed Helm charts for EKS, GKE and AKS, in your cloud account.',
        status: DEPLOYMENT_STATUS.vpc,
        points: [
            'No chart in the repository yet',
            'Your network, your account',
            'Intended to run the same engine build',
        ],
        note: 'There is no backend/charts/ directory. When it exists it will deploy the same engine, but nothing deployable is here to point at.',
    },
    {
        name: 'On-premise',
        blurb: 'A container bundle running next to your own inference — vLLM, Ollama.',
        status: DEPLOYMENT_STATUS['on-premise'],
        points: [
            'No appliance or bundle exists yet',
            'Target property: nothing leaves the building',
            'Target property: air-gap installable',
        ],
        note: 'No bundle has been cut. The two properties above are the intent, not something you can install today.',
    },
    {
        name: 'Air-gapped / classified',
        blurb: 'Zero network egress. Local embeddings, local models, offline bundle.',
        status: DEPLOYMENT_STATUS['air-gapped'],
        points: [
            'No offline bundle exists yet',
            'No verified no-egress build exists yet',
            'Intended for defence and regulated work',
        ],
        note: 'Zero egress is the property the other formats cannot offer, and it is precisely the one with no build behind it. Treat this as a commitment, not a product.',
    },
];

const CONTROLS: Array<{ label: string; state: ProductStatus }> = [
    { label: 'Tenant isolation by credential', state: DEPLOYMENT_STATUS.managed },
    { label: 'Bounded per-tenant resources', state: DEPLOYMENT_STATUS.managed },
    { label: 'SSO / OIDC and role-based access', state: 'committed' },
    { label: 'Access audit log with actor identity', state: 'committed' },
    { label: 'Right-to-erasure with certificate', state: 'committed' },
    { label: 'Support SLA and named engineer', state: 'committed' },
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
                            className={STATUS_META[f.status].accent ? styles.cardAccent : styles.card}
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
                            <p className={styles.note}>{f.note}</p>
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
                    {accountEnabled ? (
                        <>
                            <Link href="/auth/register" className="btn-primary">
                                Start on managed memory
                                <ArrowRight size={15} aria-hidden />
                            </Link>
                            <Link href="/docs#overview" className="btn-secondary">
                                Read the docs
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/docs" className="btn-primary">
                                Read the docs
                            </Link>
                            <Link href="/enterprise" className="btn-secondary">
                                Talk to us about this tier
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

function Badge({ status, bare = false }: { status: ProductStatus; bare?: boolean }) {
    const meta = STATUS_META[status];
    const Icon = status === 'live' ? Check : status === 'built' ? Wrench : Clock;
    const tone = meta.accent ? styles.badgeAccent : styles.badgeMuted;

    if (bare) {
        return (
            <span className={meta.accent ? styles.dotAccent : styles.dotMuted} title={meta.title}>
                <Icon size={10} aria-hidden />
                <span className={styles.dotLabel}>{meta.bare}</span>
            </span>
        );
    }

    return (
        <span className={tone} title={meta.title}>
            <Icon size={10} aria-hidden />
            {meta.label}
        </span>
    );
}