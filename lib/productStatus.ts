/**
 * Public status vocabulary — one module, because the same claim currently
 * lived in three files and disagreed with itself (docs called OpenCode
 * "Announcing" while the landing band marks it deployable; the on-premise
 * format floated between committed and announced depending on the page).
 *
 * The ladder, and the difference between the middle rungs:
 *
 *   live        Deployable today — a provisioning path exists and serves
 *               real requests. For harnesses: `harnessRegistry.ts` can
 *               build it and the dashboard shows it selectable.
 *   built       Implemented and covered by tests in this repo, but not
 *               deployed for customers.
 *   committed   Scoped and committed in the plan. No code behind it yet.
 *   announced   Named publicly. Nothing in the repository at all.
 *
 * A badge may not claim a control that is still pending; that rule and the
 * per-item truth below are what every claim surface reads. Changing a
 * status here is the only edit any band, page or docs table needs.
 */

export type ProductStatus = 'live' | 'built' | 'committed' | 'announced';

export interface StatusMeta {
    label: string;
    /** Compact form for tight rows (tables, card corners). */
    bare: string;
    title: string;
    accent: boolean;
}

export const STATUS_META: Record<ProductStatus, StatusMeta> = {
    live: {
        label: 'Available',
        bare: 'Live',
        title: 'Running and available to customers today.',
        accent: true,
    },
    built: {
        label: 'In build',
        bare: 'Built',
        title:
            'Written and covered by tests in this repo. Not deployed for customers: not in the production compose stack, and no tenant credentials provisioned.',
        accent: true,
    },
    committed: {
        label: 'Committed',
        bare: 'Committed',
        title: 'Scoped and committed. Not built, not shipped.',
        accent: false,
    },
    announced: {
        label: 'Announced',
        bare: 'Announced',
        title: 'Announced publicly. No implementation exists in the repository yet.',
        accent: false,
    },
};

/** Hosted harnesses. The registry is day-to-day authority; this row is the
    public claim and must move with it. */
export const HARNESS_STATUS: Record<
    'openclaw' | 'hermes' | 'opencode' | 'claude-code' | 'codex' | 'gemini-cli',
    ProductStatus
> = {
    openclaw: 'live',
    hermes: 'live',
    opencode: 'live',
    'claude-code': 'announced',
    codex: 'announced',
    'gemini-cli': 'announced',
};

/** Sovereign deployment formats for the hosted memory service. */
export const DEPLOYMENT_STATUS: Record<
    'managed' | 'vpc' | 'on-premise' | 'air-gapped',
    ProductStatus
> = {
    managed: 'built',
    vpc: 'announced',
    'on-premise': 'announced',
    'air-gapped': 'announced',
};

/** Human sentence for a status, for list rows in prose surfaces. */
export const statusPhrase: Record<ProductStatus, string> = {
    live: 'available now',
    built: 'built and tested, not yet deployed',
    committed: 'committed — scoped, no code behind it yet',
    announced: 'announced',
};
