'use client';

import { useId } from 'react';
import styles from './PipelineFlow.module.css';
import { roleShortLabel } from './roles';

interface Agent {
  agentId: string;
  teamRole: string;
  status: string;
}

interface Props {
  agents: Agent[];
}

const PIPELINE_EDGES: [string, string][] = [
  ['inbound', 'nurturing'],
  ['inbound', 'analytics'],
  ['outbound', 'qa'],
  ['outbound', 'analytics'],
  ['content', 'qa'],
  ['qa', 'content'],
  ['qa', 'analytics'],
  ['nurturing', 'analytics'],
  ['customer_success', 'analytics'],
];

/* SVG user units, not pixels. The graph scales with the viewBox; the node
   labels are absolutely positioned in CSS pixels, so they only line up
   when the rendered width happens to equal 600. Below that threshold we
   render an ordered list instead of a graph that would mislead. */
const ROLE_POSITIONS: Record<string, { x: number; y: number }> = {
  inbound: { x: 50, y: 50 },
  outbound: { x: 200, y: 50 },
  content: { x: 350, y: 50 },
  qa: { x: 350, y: 150 },
  nurturing: { x: 50, y: 150 },
  analytics: { x: 200, y: 250 },
  customer_success: { x: 500, y: 150 },
};

export default function PipelineFlow({ agents }: Props) {
  /* Global DOM ids collide when two flows render on one page. */
  const markerId = useId().replace(/:/g, '');
  const activeRoles = new Set(agents.map((a) => a.teamRole));

  const statusColor = (role: string) => {
    const agent = agents.find((a) => a.teamRole === role);
    if (!agent) return 'var(--mid-grey)';
    if (agent.status === 'running') return '#10b981';
    if (agent.status === 'stopped') return '#f59e0b';
    return '#6b7280';
  };

  const ordered = Object.keys(ROLE_POSITIONS).filter((r) => activeRoles.has(r));

  return (
    <div className={styles.flowRoot}>
      {/* Desktop: the spatial graph */}
      <div className={styles.flowGraph} role="img" aria-label={`Pipeline flow across ${ordered.length} agents`}>
        <svg width="100%" height="100%" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet">
          {PIPELINE_EDGES.map(([from, to]) => {
            if (!activeRoles.has(from) || !activeRoles.has(to)) return null;
            const start = ROLE_POSITIONS[from];
            const end = ROLE_POSITIONS[to];
            if (!start || !end) return null;
            return (
              <line
                key={`${from}-${to}`}
                x1={start.x + 50}
                y1={start.y + 20}
                x2={end.x + 50}
                y2={end.y + 20}
                stroke="var(--border-subtle)"
                strokeWidth="2"
                markerEnd={`url(#${markerId})`}
              />
            );
          })}
          <defs>
            <marker id={markerId} markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--mid-grey)" />
            </marker>
          </defs>
        </svg>

        {ordered.map((role) => {
          const pos = ROLE_POSITIONS[role];
          return (
            <div
              key={role}
              className={styles.node}
              style={{
                left: `${(pos.x / 600) * 100}%`,
                top: `${(pos.y / 300) * 100}%`,
                borderColor: statusColor(role),
              }}
            >
              <span className={styles.nodeDot} style={{ background: statusColor(role) }} />
              {roleShortLabel(role)}
            </div>
          );
        })}
      </div>

      {/* Mobile: percentage-positioned nodes drift out of alignment with the
          scaled SVG, so below the threshold this becomes a plain list. */}
      <ul className={styles.flowList}>
        {ordered.map((role) => (
          <li key={role} className={styles.flowListItem}>
            <span className={styles.nodeDot} style={{ background: statusColor(role) }} />
            <span>{roleShortLabel(role)}</span>
            <span className={styles.flowListStatus}>{agents.find((a) => a.teamRole === role)?.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
