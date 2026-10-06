/**
 * Enterprise team role definitions — single source of truth.
 *
 * Previously AGENT_ROLES lived inside ConfigurationStep, so GoLiveStep had
 * to render raw snake_case ids ("customer_success") on the review screen
 * because it had no access to the display names shown one screen earlier.
 * PipelineFlow kept a third, abbreviated copy of the same names.
 */

export interface AgentRole {
    id: string;
    name: string;
    /** Short form for the flow graph and other dense layouts. */
    short: string;
    description: string;
}

export const AGENT_ROLES: AgentRole[] = [
    { id: 'inbound', name: 'Inbound Agent', short: 'Inbound', description: 'Captures and qualifies leads 24/7' },
    { id: 'outbound', name: 'Outbound Agent', short: 'Outbound', description: 'Personalised cold outreach and follow-ups' },
    { id: 'content', name: 'Content & Copy Agent', short: 'Content', description: 'Blog posts, social media, newsletters' },
    { id: 'qa', name: 'QA & Editor Agent', short: 'QA', description: 'Quality review and brand consistency' },
    { id: 'nurturing', name: 'Lead Nurturing Agent', short: 'Nurturing', description: 'Behavioural follow-up sequences' },
    { id: 'analytics', name: 'Analytics Agent', short: 'Analytics', description: 'Performance reports and briefings' },
    { id: 'customer_success', name: 'Customer Success Agent', short: 'Customer Success', description: 'Onboarding and retention' },
];

const BY_ID = new Map(AGENT_ROLES.map((r) => [r.id, r]));

/** Display name for a role id, or the id itself if it is not one we know. */
export function roleLabel(id: string): string {
    return BY_ID.get(id)?.name ?? id;
}

/** Short display name, for the flow graph and mobile list. */
export function roleShortLabel(id: string): string {
    return BY_ID.get(id)?.short ?? id;
}

export const TIER_LIMITS: Record<string, number> = {
    starter: 3,
    growth: 5,
    enterprise_custom: 7,
};

/** Display names for the tier ids used in URLs and the API payload. */
const TIER_LABELS: Record<string, string> = {
    starter: 'Starter',
    growth: 'Growth',
    enterprise_custom: 'Enterprise',
    free: 'Free',
    hobby: 'Hobby',
    pro: 'Professional',
    enterprise: 'Enterprise',
};

export function tierLabel(id: string): string {
    return TIER_LABELS[id] ?? id;
}

export function maxAgentsForTier(tier: string): number {
    return TIER_LIMITS[tier] ?? 3;
}
