import { describe, it, expect } from 'vitest';
import { AGENT_ROLES, roleLabel, roleShortLabel, tierLabel, maxAgentsForTier, TIER_LIMITS } from '../components/enterprise/roles';

/**
 * The Go Live review screen used to print raw identifiers — the tier id
 * ("enterprise_custom") and snake_case role ids ("customer_success") —
 * for values the user had just selected by their display names one screen
 * earlier. This pins the id -> label mapping so that cannot regress.
 */
describe('enterprise role labels', () => {
    it('has a unique id and name per role', () => {
        expect(new Set(AGENT_ROLES.map((r) => r.id)).size).toBe(AGENT_ROLES.length);
        expect(new Set(AGENT_ROLES.map((r) => r.name)).size).toBe(AGENT_ROLES.length);
    });

    it('never returns an id where a display name is expected', () => {
        for (const role of AGENT_ROLES) {
            expect(roleLabel(role.id)).toBe(role.name);
            // A label identical to the id means the map missed it
            expect(roleLabel(role.id)).not.toBe(role.id);
            expect(roleShortLabel(role.id)).toBe(role.short);
        }
    });

    it('resolves every role id used by the flow graph', () => {
        // ids that PipelineFlow draws edges for
        const graphRoles = ['inbound', 'outbound', 'content', 'qa', 'nurturing', 'analytics', 'customer_success'];
        for (const id of graphRoles) {
            expect(roleLabel(id)).not.toBe(id);
        }
    });

    it('falls back to the raw value for an unknown id rather than blank', () => {
        expect(roleLabel('nonexistent')).toBe('nonexistent');
        expect(tierLabel('nonexistent')).toBe('nonexistent');
    });

    it('maps every tier id used in URLs to a display name', () => {
        expect(tierLabel('starter')).toBe('Starter');
        expect(tierLabel('growth')).toBe('Growth');
        expect(tierLabel('enterprise_custom')).toBe('Enterprise');
        for (const id of Object.keys(TIER_LIMITS)) {
            expect(tierLabel(id)).not.toBe(id);
        }
    });

    it('caps agents per tier, defaulting to 3', () => {
        expect(maxAgentsForTier('starter')).toBe(3);
        expect(maxAgentsForTier('growth')).toBe(5);
        expect(maxAgentsForTier('enterprise_custom')).toBe(7);
        expect(maxAgentsForTier('hobby')).toBe(3);
        expect(maxAgentsForTier('garbage')).toBe(3);
    });

    it('never exposes a raw snake_case id in a label', () => {
        for (const role of AGENT_ROLES) {
            expect(roleLabel(role.id)).not.toContain('_');
            expect(roleShortLabel(role.id)).not.toContain('_');
        }
    });
});
