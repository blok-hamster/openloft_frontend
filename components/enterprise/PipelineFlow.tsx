'use client';

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
  const activeRoles = new Set(agents.map((a) => a.teamRole));

  const statusColor = (role: string) => {
    const agent = agents.find((a) => a.teamRole === role);
    if (!agent) return '#d1d5db';
    if (agent.status === 'running') return '#10b981';
    if (agent.status === 'stopped') return '#f59e0b';
    return '#6b7280';
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '320px', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 600 300" style={{ position: 'absolute', top: 0, left: 0 }}>
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
              stroke="#e5e7eb"
              strokeWidth="2"
              markerEnd="url(#arrow)"
            />
          );
        })}
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="#9ca3af" />
          </marker>
        </defs>
      </svg>

      {Object.entries(ROLE_POSITIONS).map(([role, pos]) => {
        if (!activeRoles.has(role)) return null;
        return (
          <div
            key={role}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: 100,
              padding: '0.5rem',
              background: 'white',
              border: `2px solid ${statusColor(role)}`,
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '0.7rem',
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(role), margin: '0 auto 4px' }} />
            {role.replace('_', ' ')}
          </div>
        );
      })}
    </div>
  );
}
