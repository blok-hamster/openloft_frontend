'use client';

import { useState } from 'react';
import steps from './EnterpriseSteps.module.css';

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
    <form onSubmit={handleSubmit} className={steps.stepFormTight}>
      <h2 className={steps.stepHeading}>Tell us about your business</h2>
      <p className={steps.stepIntro}>This helps us configure your AI team to match your brand voice and target audience.</p>

      <label className={steps.field}>
        <span className={steps.fieldLabel}>Company Name</span>
        <input type="text" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className={steps.input} />
      </label>

      <label className={steps.field}>
        <span className={steps.fieldLabel}>Industry</span>
        <input type="text" required value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g., B2B SaaS, E-commerce, Professional Services" className={steps.input} />
      </label>

      <label className={steps.field}>
        <span className={steps.fieldLabel}>Target Audience</span>
        <input type="text" required value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} placeholder="e.g., SMB founders, enterprise CTOs, marketing managers" className={steps.input} />
      </label>

      <label className={steps.field}>
        <span className={steps.fieldLabel}>Tone of Voice (comma-separated)</span>
        <input type="text" value={form.toneOfVoice} onChange={(e) => setForm({ ...form, toneOfVoice: e.target.value })} placeholder="e.g., professional, warm, data-driven" className={steps.input} />
      </label>

      <label className={steps.field}>
        <span className={steps.fieldLabel}>Brand Values (comma-separated)</span>
        <input type="text" value={form.brandValues} onChange={(e) => setForm({ ...form, brandValues: e.target.value })} placeholder="e.g., innovation, transparency, customer-first" className={steps.input} />
      </label>

      <label className={steps.field}>
        <span className={steps.fieldLabel}>Words/Phrases to Use (comma-separated)</span>
        <input type="text" value={form.vocabularyDo} onChange={(e) => setForm({ ...form, vocabularyDo: e.target.value })} className={steps.input} />
      </label>

      <label className={steps.field}>
        <span className={steps.fieldLabel}>Words/Phrases to Avoid (comma-separated)</span>
        <input type="text" value={form.vocabularyDont} onChange={(e) => setForm({ ...form, vocabularyDont: e.target.value })} className={steps.input} />
      </label>

      <label className={steps.field}>
        <span className={steps.fieldLabel}>Content Rules (one per line)</span>
        <textarea rows={3} value={form.contentRules} onChange={(e) => setForm({ ...form, contentRules: e.target.value })} placeholder="e.g., Always cite sources&#10;Keep blog posts under 1000 words" className={steps.textarea} />
      </label>

      <button type="submit" className={steps.submitButton}>Continue to Integrations</button>
    </form>
  );
}


