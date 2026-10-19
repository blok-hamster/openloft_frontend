import Link from 'next/link';
import { Check, Clock, Monitor } from 'lucide-react';
import styles from './HarnessBand.module.css';

type Status = 'live' | 'announced';

/**
 * The agents we host.
 *
 * Previously this band split "we deploy" from "you bring", which was wrong —
 * hosting these agents is the product. What replaced that split is a status
 * distinction, not an ownership one: every agent here is deployed and operated
 * by OpenLoft, and the badge says whether that is true today or next.
 *
 * Status is load-bearing and is not decorative:
 *
 *   live         `Agent.agentType` accepts it and DockerService provisions it
 *   announced    a CLI agent we intend to containerise. CLI agents are the
 *                viable set — Claude Code, OpenCode, Codex and Gemini CLI all
 *                run headless and take an API key. A desktop IDE is not
 *                hostable and is listed separately below instead of being
 *                promised here.
 *
 * The enum is `['openclaw','hermes','opencode','claude-code','codex']`
 * (`backend/src/models/Agent.ts:8`, mirrored at `Agent.ts:45` and
 * `TeamTemplate.ts:35`), but the *registry* is the authority on which of those
 * a provisioning path exists for — `harnessRegistry.ts`. That registry is also
 * what the dashboard reads, via `GET /agents/harnesses`, and `AGENT_HARNESSES`
 * decides what is selectable there. So a card can be `live` on this page and
 * still be unselectable in the dashboard, which is an operator switch rather
 * than a code change.
 *
 * Moving OpenCode from announced to live is not a marketing edit: the enum
 * accepts it, `provisionOpenCodeAgent` exists (`DockerService.ts`), the
 * provisioner path is the same Traefik `Host()` router the other two use, and
 * `openclaw`'s copy about it being "bring your own key" now also covers
 * platform credits, because OpenCode accepts a `baseURL` and can therefore be
 * pointed at the metering gateway.
 *
 * Subdomains: every live agent really does get one. OpenClaw routes
 * `Host(`${agentId}.${domain}`)` to its API, plugin and webhook routers
 * (`DockerService.ts:542-556`); Hermes routes the same host to its dashboard UI
 * and OpenAI-compatible gateway (`DockerService.ts:751-762`); OpenCode routes it
 * to `opencode serve` on 4096. What Hermes does not get is the A2A peer mesh —
 * `ConfigService.ts:410-411` filters it out with the comment "Only sync OpenClaw
 * agents (Hermes does not support A2A)". Neither does OpenCode, which is why its
 * lede calls out the HTTP server rather than A2A.
 *
 * Your own plan is explicit about this: "Either write them or mark the adapter
 * coming soon — do not ship a config block that cannot work." So the live
 * agents are marked Available and the rest Announcing. Nothing on this page
 * claims a deployment that does not exist.
 */
const AGENTS: Array<{
    name: string;
    blurb: string;
    status: Status;
    detail: string;
}> = [
    {
        name: 'OpenClaw',
        blurb: 'Plugin ecosystem, A2A agent mesh, skills and MCP servers.',
        status: 'live',
        detail: 'Web UI on a dedicated subdomain',
    },
    {
        name: 'OpenCode',
        blurb: 'Open-source terminal agent, any LLM provider.',
        status: 'live',
        detail: 'Bring your own provider key, or platform credits',
    },
    {
        name: 'Hermes Agent',
        blurb: 'Self-improving skills, cron scheduling, browser automation.',
        status: 'live',
        detail: 'OpenAI-compatible gateway, standalone (no A2A mesh)',
    },
    {
        name: 'Claude Code',
        blurb: 'Anthropic’s terminal agent, containerised and run on our infrastructure.',
        status: 'announced',
        detail: 'Bring your own Anthropic key',
    },
    {
        name: 'Codex',
        blurb: 'OpenAI’s coding agent, headless in its own container.',
        status: 'announced',
        detail: 'Bring your own OpenAI key',
    },
    {
        name: 'Gemini CLI',
        blurb: 'Google’s terminal agent, same hosting and same memory.',
        status: 'announced',
        detail: 'Bring your own Google key',
    },
];

export default function HarnessBand() {
    const live = AGENTS.filter((a) => a.status === 'live');
    const announced = AGENTS.filter((a) => a.status === 'announced');

    return (
        <section className={styles.band} id="agents">
            <div className={styles.container}>
                <h2 className={styles.title}>We host the agents</h2>

                <p className={styles.lede}>
                    Pick a harness. We provision it, run it, put it on its own
                    subdomain, and wire it to the same memory as everything else you
                    deploy. You bring an API key; we bring the infrastructure. OpenClaw
                    agents also join the A2A peer mesh; Hermes and OpenCode run
                    standalone. OpenCode can spend your platform credits as well as a
                    key of your own, because it talks to a `baseURL`.
                </p>

                <p className={styles.groupLabel}>Available now</p>
                <div className={styles.grid}>
                    {live.map((agent) => (
                        <AgentCard key={agent.name} {...agent} />
                    ))}
                </div>

                <p className={styles.groupLabel}>Announcing</p>
                <div className={styles.grid}>
                    {announced.map((agent) => (
                        <AgentCard key={agent.name} {...agent} />
                    ))}
                </div>

                <div className={styles.ide}>
                    <Monitor size={18} aria-hidden />
                    <p className={styles.ideBody}>
                        <strong>Using a desktop editor?</strong> Cursor, Windsurf and
                        VS Code cannot be hosted — they are applications on your
                        machine. They read the same memory over MCP, so an IDE session
                        and a hosted agent see one shared history.{' '}
                        <Link href="/docs">
                            One small config block per client, and it has to be launched
                            from the repo root.
                        </Link>{' '}
                        The MCP filename and schema differ by editor, and the server
                        reads <code>configs/default.toml</code> relative to the working
                        directory — started anywhere else it silently falls back to
                        library defaults.
                    </p>
                </div>

            </div>
        </section>
    );
}

function AgentCard({
    name,
    blurb,
    status,
    detail,
}: {
    name: string;
    blurb: string;
    status: Status;
    detail: string;
}) {
    const live = status === 'live';
    const Badge = live ? Check : Clock;

    return (
        <div className={live ? styles.cardLive : styles.card}>
            <div className={styles.cardHead}>
                <h3 className={styles.cardName}>{name}</h3>
                <span
                    className={live ? styles.badgeLive : styles.badgeAnnounced}
                    title={
                        live
                            ? 'Deployable today'
                            : 'Announced. Not yet selectable in the dashboard.'
                    }
                >
                    <Badge size={10} aria-hidden />
                    {live ? 'Available' : 'Announcing'}
                </span>
            </div>
            <p className={styles.cardBlurb}>{blurb}</p>
            <p className={styles.cardDetail}>{detail}</p>
        </div>
    );
}