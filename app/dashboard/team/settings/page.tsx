'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const [styleGuide, setStyleGuide] = useState<any>({});
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams`, {
        headers: { Authorization: `Bearer ${(user as any)?.token}` },
      });
      const deployments = await res.json();
      if (deployments.length > 0) {
        setDeploymentId(deployments[0].deploymentId);
        const guideRes = await fetch(`${API_URL}/api/teams/${deployments[0].deploymentId}/style-guide`, {
          headers: { Authorization: `Bearer ${(user as any)?.token}` },
        });
        const guide = await guideRes.json();
        setStyleGuide(guide);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSave = async () => {
    if (!deploymentId) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/teams/${deploymentId}/style-guide`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(user as any)?.token}` },
        body: JSON.stringify(styleGuide),
      });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>Team Settings</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Brand Style Guide</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label>
            <span style={labelStyle}>Company Name</span>
            <input type="text" value={styleGuide.companyName || ''} onChange={(e) => setStyleGuide({ ...styleGuide, companyName: e.target.value })} style={inputStyle} />
          </label>

          <label>
            <span style={labelStyle}>Industry</span>
            <input type="text" value={styleGuide.industry || ''} onChange={(e) => setStyleGuide({ ...styleGuide, industry: e.target.value })} style={inputStyle} />
          </label>

          <label>
            <span style={labelStyle}>Target Audience</span>
            <input type="text" value={styleGuide.targetAudience || ''} onChange={(e) => setStyleGuide({ ...styleGuide, targetAudience: e.target.value })} style={inputStyle} />
          </label>

          <label>
            <span style={labelStyle}>Tone of Voice (comma-separated)</span>
            <input type="text" value={(styleGuide.toneOfVoice || []).join(', ')} onChange={(e) => setStyleGuide({ ...styleGuide, toneOfVoice: e.target.value.split(',').map((s: string) => s.trim()) })} style={inputStyle} />
          </label>

          <label>
            <span style={labelStyle}>Content Rules (one per line)</span>
            <textarea rows={4} value={(styleGuide.contentRules || []).join('\n')} onChange={(e) => setStyleGuide({ ...styleGuide, contentRules: e.target.value.split('\n') })} style={{ ...inputStyle, resize: 'vertical' }} />
          </label>
        </div>

        <button onClick={handleSave} disabled={saving} style={{ ...buttonStyle, marginTop: '1rem' }}>
          {saving ? 'Saving...' : 'Save Style Guide'}
        </button>
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Triggers & Schedules</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Behavioral triggers and report schedules can be configured via the API or will be managed in a future dashboard update.
        </p>
      </section>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontWeight: 500, fontSize: '0.85rem' };
const inputStyle: React.CSSProperties = { display: 'block', width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem', marginTop: '0.25rem' };
const buttonStyle: React.CSSProperties = { padding: '0.6rem 1.25rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' };
