'use client';

import { useState } from 'react';

interface Props {
  onComplete: (data: any) => void;
}

export default function IntegrationStep({ onComplete }: Props) {
  const [form, setForm] = useState({
    crmProvider: '',
    crmApiKey: '',
    emailProvider: '',
    emailApiKey: '',
    socialPlatforms: '',
    analyticsProvider: '',
    analyticsTrackingId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      crm: { provider: form.crmProvider, apiKey: form.crmApiKey, connected: !!form.crmApiKey },
      email: { provider: form.emailProvider, apiKey: form.emailApiKey, connected: !!form.emailApiKey },
      social: { platforms: form.socialPlatforms.split(',').map((s) => s.trim()).filter(Boolean), connected: !!form.socialPlatforms },
      analytics: { provider: form.analyticsProvider, trackingId: form.analyticsTrackingId, connected: !!form.analyticsTrackingId },
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Connect Your Tools</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Connect your existing CRM, email provider, and social accounts. You can skip any and configure later.</p>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>CRM</legend>
        <select value={form.crmProvider} onChange={(e) => setForm({ ...form, crmProvider: e.target.value })} style={inputStyle}>
          <option value="">Select CRM...</option>
          <option value="hubspot">HubSpot</option>
          <option value="salesforce">Salesforce</option>
          <option value="pipedrive">Pipedrive</option>
          <option value="other">Other</option>
        </select>
        <input type="text" placeholder="API Key" value={form.crmApiKey} onChange={(e) => setForm({ ...form, crmApiKey: e.target.value })} style={inputStyle} />
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Email Provider</legend>
        <select value={form.emailProvider} onChange={(e) => setForm({ ...form, emailProvider: e.target.value })} style={inputStyle}>
          <option value="">Select provider...</option>
          <option value="sendgrid">SendGrid</option>
          <option value="mailgun">Mailgun</option>
          <option value="resend">Resend</option>
          <option value="smtp">Custom SMTP</option>
        </select>
        <input type="text" placeholder="API Key" value={form.emailApiKey} onChange={(e) => setForm({ ...form, emailApiKey: e.target.value })} style={inputStyle} />
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Social Media</legend>
        <input type="text" placeholder="Platforms (comma-separated): linkedin, twitter, instagram" value={form.socialPlatforms} onChange={(e) => setForm({ ...form, socialPlatforms: e.target.value })} style={inputStyle} />
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Analytics</legend>
        <select value={form.analyticsProvider} onChange={(e) => setForm({ ...form, analyticsProvider: e.target.value })} style={inputStyle}>
          <option value="">Select provider...</option>
          <option value="google-analytics">Google Analytics</option>
          <option value="mixpanel">Mixpanel</option>
          <option value="plausible">Plausible</option>
        </select>
        <input type="text" placeholder="Tracking ID" value={form.analyticsTrackingId} onChange={(e) => setForm({ ...form, analyticsTrackingId: e.target.value })} style={inputStyle} />
      </fieldset>

      <button type="submit" style={buttonStyle}>Continue to Configuration</button>
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
  marginTop: '0.5rem',
};

const fieldsetStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1rem',
};

const legendStyle: React.CSSProperties = {
  fontWeight: 500,
  fontSize: '0.9rem',
  padding: '0 0.5rem',
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
