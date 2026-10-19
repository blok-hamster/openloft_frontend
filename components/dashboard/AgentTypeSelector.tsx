'use client';

import Card from '@/components/ui/Card';
import type { HarnessType } from '@/lib/api';
import styles from './Dashboard.module.css';
import selector from './AgentTypeSelector.module.css';

/**
 * Harness picker.
 *
 * Was two hardcoded cards for a two-value union. The union is now five wide, so
 * the cards come from the server's capability list plus this file's display copy.
 * Adding a harness is a copy entry here and a registry entry in the backend —
 * not six edits across the wizard, agent card, credentials modal and chat panel.
 *
 * `selectable` is the backend's word on whether the operator switched this
 * harness on (`AGENT_HARNESSES`). An unselectable harness is still shown, marked,
 * because silently hiding it reads as a bug rather than as a policy.
 *
 * Capability flags from the server are carried through untouched so a caller can
 * read them off the emitted value — the UI branches on `servesHttp` /
 * `needsTerminal`, never on the type string.
 */

interface HarnessRow {
    type: string;
    selectable: boolean;
    servesHttp: boolean;
    needsTerminal: boolean;
}

/** Display copy. Deliberately local: the API owns capability, not prose. */
const HARNESS_COPY: Record<string, { name: string; blurb: string; features: string[] }> = {
    openclaw: {
        name: 'OpenClaw',
        blurb: 'Full-featured AI orchestrator with skills, plugins, and A2A communication.',
        features: ['+ Plugin ecosystem (Discord, Telegram, Slack)', '+ Agent-to-Agent protocol (A2A)', '+ Custom skill files & MCP servers', '+ Fine-grained config control'],
    },
    hermes: {
        name: 'Hermes Agent',
        blurb: 'Self-improving agent with autonomous skill creation and persistent memory.',
        features: ['+ Auto-creates & improves skills', '+ Persistent cross-session memory', '+ Browser automation (Playwright)', '+ 300+ model support via Nous Portal'],
    },
    opencode: {
        name: 'OpenCode',
        blurb: 'Open-source terminal agent, any LLM provider.',
        features: ['+ Own HTTP server on its subdomain', '+ Any provider, incl. platform credits', '+ Interactive terminal', '+ Explicit permission policy'],
    },
    'claude-code': {
        name: 'Claude Code',
        blurb: 'Anthropic’s terminal agent, containerised on our infrastructure.',
        features: ['+ NDJSON streaming protocol', '+ Interactive terminal', '! Bring your own Anthropic key', '- No platform credits (vendor policy)'],
    },
    codex: {
        name: 'Codex',
        blurb: 'OpenAI’s coding agent, headless in its own container.',
        features: ['+ App Server JSON-RPC protocol', '+ Interactive terminal', '+ Sandboxed by default', '+ Usage metered through your gateway'],
    },
};

/** Merge server capability with local copy; falls back to the raw type. */
const withCopy = (r: HarnessRow) => ({
    ...r,
    name: HARNESS_COPY[r.type]?.name ?? r.type,
    blurb: HARNESS_COPY[r.type]?.blurb ?? `A hosted agent harness (${r.type}).`,
    features: HARNESS_COPY[r.type]?.features ?? ['+ Hosted on its own subdomain'],
});

export type HarnessOption = ReturnType<typeof withCopy>;

/** Dropdown/review labels. Exported so the wizard does not re-declare the names. */
export const HARNESS_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(HARNESS_COPY).map(([k, v]) => [k, v.name])
);

interface AgentTypeSelectorProps {
    value: HarnessType;
    onChange: (type: HarnessType) => void;
    /** From GET /agents/harnesses. Empty leaves the picker with nothing to offer. */
    harnesses: HarnessRow[];
}

export default function AgentTypeSelector({ value, onChange, harnesses }: AgentTypeSelectorProps) {
    const options = harnesses.map(withCopy);

    if (options.length === 0) {
        return <div className={selector.grid}>No harnesses are currently available.</div>;
    }

    return (
        <div className={selector.grid}>
            {options.map((h) => (
                <Card
                    key={h.type}
                    className={`${value === h.type ? styles.activePlanCard : ''} ${selector.optionCard} ${
                        h.selectable ? '' : selector.optionCardDisabled
                    }`}
                    onClick={() => {
                        // Only a selectable harness may be chosen, but the type is
                        // still a valid HarnessType — the API accepts it.
                        if (h.selectable) onChange(h.type as HarnessType);
                    }}
                >
                    <h4 className={selector.optionTitle}>
                        {h.name}
                        {!h.selectable && <span className={selector.soon}>soon</span>}
                    </h4>
                    <p className={selector.optionBlurb}>{h.blurb}</p>
                    <ul className={selector.optionList}>
                        {h.features.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                </Card>
            ))}
        </div>
    );
}
