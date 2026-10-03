'use client';

interface Props {
  formData: { discovery: any; integrations: any; config: any };
  tier: string;
  onDeploy: () => void;
}

export default function GoLiveStep({ formData, tier, onDeploy }: Props) {
  const { discovery, integrations, config } = formData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Review & Go Live</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Review your configuration below. Once deployed, your AI team will be live within 48 hours.
      </p>

      <section style={sectionStyle}>
        <h3 style={sectionTitle}>Brand</h3>
        <p><strong>Company:</strong> {discovery.companyName}</p>
        <p><strong>Industry:</strong> {discovery.industry}</p>
        <p><strong>Target Audience:</strong> {discovery.targetAudience}</p>
        {discovery.toneOfVoice?.length > 0 && <p><strong>Tone:</strong> {discovery.toneOfVoice.join(', ')}</p>}
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitle}>Integrations</h3>
        <p><strong>CRM:</strong> {integrations.crm?.provider || 'Not configured'} {integrations.crm?.connected ? '(Connected)' : ''}</p>
        <p><strong>Email:</strong> {integrations.email?.provider || 'Not configured'} {integrations.email?.connected ? '(Connected)' : ''}</p>
        <p><strong>Social:</strong> {integrations.social?.platforms?.join(', ') || 'Not configured'}</p>
        <p><strong>Analytics:</strong> {integrations.analytics?.provider || 'Not configured'}</p>
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitle}>Team Configuration</h3>
        <p><strong>Plan:</strong> {tier}</p>
        <p><strong>Agents:</strong> {config.selectedAgents?.join(', ')}</p>
        <p><strong>LLM Provider:</strong> {config.llmProvider}</p>
      </section>

      <div style={{ background: '#f5f3ff', border: '1px solid #e0e7ff', borderRadius: '8px', padding: '1rem' }}>
        <p style={{ fontWeight: 500, fontSize: '0.9rem', margin: 0 }}>
          Your AI team will be deployed on dedicated infrastructure and operational within 48 hours.
        </p>
      </div>

      <button onClick={onDeploy} style={deployButtonStyle}>
        Deploy Team
      </button>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1rem',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 600,
  marginBottom: '0.5rem',
};

const deployButtonStyle: React.CSSProperties = {
  padding: '1rem 2rem',
  background: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '1rem',
  cursor: 'pointer',
  alignSelf: 'center',
};
