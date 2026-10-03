'use client';

import { useState } from 'react';

interface Props {
  onComplete: (data: any) => void;
}

export default function DiscoveryStep({ onComplete }: Props) {
  const [form, setForm] = useState({
    companyName: '',
    industry: '',
    targetAudience: '',
    toneOfVoice: '',
    brandValues: '',
    vocabularyDo: '',
    vocabularyDont: '',
    contentRules: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      companyName: form.companyName,
      industry: form.industry,
      targetAudience: form.targetAudience,
      toneOfVoice: form.toneOfVoice.split(',').map((s) => s.trim()).filter(Boolean),
      brandValues: form.brandValues.split(',').map((s) => s.trim()).filter(Boolean),
      vocabularyDo: form.vocabularyDo.split(',').map((s) => s.trim()).filter(Boolean),
      vocabularyDont: form.vocabularyDont.split(',').map((s) => s.trim()).filter(Boolean),
      contentRules: form.contentRules.split('\n').filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Tell us about your business</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>This helps us configure your AI team to match your brand voice and target audience.</p>

      <label>
        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Company Name</span>
        <input type="text" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} style={inputStyle} />
      </label>

      <label>
        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Industry</span>
        <input type="text" required value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g., B2B SaaS, E-commerce, Professional Services" style={inputStyle} />
      </label>

      <label>
        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Target Audience</span>
        <input type="text" required value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} placeholder="e.g., SMB founders, enterprise CTOs, marketing managers" style={inputStyle} />
      </label>

      <label>
        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Tone of Voice (comma-separated)</span>
        <input type="text" value={form.toneOfVoice} onChange={(e) => setForm({ ...form, toneOfVoice: e.target.value })} placeholder="e.g., professional, warm, data-driven" style={inputStyle} />
      </label>

      <label>
        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Brand Values (comma-separated)</span>
        <input type="text" value={form.brandValues} onChange={(e) => setForm({ ...form, brandValues: e.target.value })} placeholder="e.g., innovation, transparency, customer-first" style={inputStyle} />
      </label>

      <label>
        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Words/Phrases to Use (comma-separated)</span>
        <input type="text" value={form.vocabularyDo} onChange={(e) => setForm({ ...form, vocabularyDo: e.target.value })} style={inputStyle} />
      </label>

      <label>
        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Words/Phrases to Avoid (comma-separated)</span>
        <input type="text" value={form.vocabularyDont} onChange={(e) => setForm({ ...form, vocabularyDont: e.target.value })} style={inputStyle} />
      </label>

      <label>
        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Content Rules (one per line)</span>
        <textarea rows={3} value={form.contentRules} onChange={(e) => setForm({ ...form, contentRules: e.target.value })} placeholder="e.g., Always cite sources&#10;Keep blog posts under 1000 words" style={{ ...inputStyle, resize: 'vertical' }} />
      </label>

      <button type="submit" style={buttonStyle}>Continue to Integrations</button>
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
