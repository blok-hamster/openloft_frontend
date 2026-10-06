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
 * Your own plan is explicit about this: "Either write them or mark the adapter
 * coming soon — do not ship a config block that cannot work." So the two live
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
        name: 'Hermes Agent',
        blurb: 'Self-improving skills, cron scheduling, browser automation.',
        status: 'live',
        detail: 'OpenAI-compatible gateway',
    },
    {
        name: 'Claude Code',
        blurb: 'Anthropic’s terminal agent, containerised and run on our infrastructure.',
        status: 'announced',
        detail: 'Bring your own Anthropic key',
    },
    {
        name: 'OpenCode',
        blurb: 'Open-source terminal agent, any LLM provider.',
        status: 'announced',
        detail: 'Bring your own provider key',
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
                    Pick a harness. We provision it, run it, give it a subdomain, and
                    wire it to the same memory as everything else you deploy. You bring
                    an API key; we bring the infrastructure.
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
                        <Link href="/docs">Setup is one config block.</Link>
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