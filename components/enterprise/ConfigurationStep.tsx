'use client';

import { useState } from 'react';

const AGENT_ROLES = [
  { id: 'inbound', name: 'Inbound Agent', description: 'Captures and qualifies leads 24/7' },
  { id: 'outbound', name: 'Outbound Agent', description: 'Personalised cold outreach and follow-ups' },
  { id: 'content', name: 'Content & Copy Agent', description: 'Blog posts, social media, newsletters' },
  { id: 'qa', name: 'QA & Editor Agent', description: 'Quality review and brand consistency' },
  { id: 'nurturing', name: 'Lead Nurturing Agent', description: 'Behavioural follow-up sequences' },
  { id: 'analytics', name: 'Analytics Agent', description: 'Performance reports and briefings' },
  { id: 'customer_success', name: 'Customer Success Agent', description: 'Onboarding and retention' },
];

const TIER_LIMITS: Record<string, number> = { starter: 3, growth: 5, enterprise_custom: 7 };

interface Props {
  tier: string;
  onComplete: (data: any) => void;
}

export default function ConfigurationStep({ tier, onComplete }: Props) {
  const maxAgents = TIER_LIMITS[tier] || 3;
  const [selectedAgents, setSelectedAgents] = useState<string[]>(AGENT_ROLES.slice(0, maxAgents).map((a) => a.id));
  const [llmProvider, setLlmProvider] = useState('anthropic');

  const toggleAgent = (id: string) => {
    if (selectedAgents.includes(id)) {
      setSelectedAgents(selectedAgents.filter((a) => a !== id));
    } else if (selectedAgents.length < maxAgents) {
      setSelectedAgents([...selectedAgents, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ selectedAgents, llmProvider, maxAgents });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Configure Your Team</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Select up to {maxAgents} agents for your {tier} plan. You can adjust this later.
      </p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {AGENT_ROLES.map((role) => {
          const selected = selectedAgents.includes(role.id);
          const disabled = !selected && selectedAgents.length >= maxAgents;
          return (
            <label
              key={role.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                border: `1px solid ${selected ? '#6366f1' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                background: selected ? '#f5f3ff' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={selected}
                disabled={disabled}
                onChange={() => toggleAgent(role.id)}
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{role.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{role.description}</div>
              </div>
            </label>
          );
        })}
      </div>

      <label>
        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>LLM Provider</span>
        <select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)} style={inputStyle}>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI (GPT)</option>
          <option value="google">Google (Gemini)</option>
          <option value="groq">Groq (Llama)</option>
          <option value="deepseek">DeepSeek</option>
        </select>
      </label>

      <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
        Selected: {selectedAgents.length}/{maxAgents} agents
      </p>

      <button type="submit" disabled={selectedAgents.length === 0} style={buttonStyle}>
        Review & Deploy
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.6rem 0.75rem',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  fontSize: '0.9rem',
  marginTop: '0.25rem',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  background: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 500,
  cursor: 'pointer',
  alignSelf: 'flex-end',
};
