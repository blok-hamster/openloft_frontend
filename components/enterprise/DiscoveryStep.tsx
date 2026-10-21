'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import steps from './EnterpriseSteps.module.css';

export interface DiscoveryData {
  companyName: string;
  industry: string;
  targetAudience: string;
  toneOfVoice: string[];
  brandValues: string[];
  vocabularyDo: string[];
  vocabularyDont: string[];
  contentRules: string[];
}

interface Props {
  onComplete: (data: DiscoveryData) => void;
}

const splitCsv = (value: string) => value.split(',').map((part) => part.trim()).filter(Boolean);

/**
 * Step one of enterprise onboarding. Fields come from the UI kit now: the
 * raw `<input className={styles.input}>` set duplicated the kit's label,
 * focus ring and error wiring, and only the kit fields are covered by the
 * shared touch-target and contrast rules.
 */
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

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      companyName: form.companyName,
      industry: form.industry,
      targetAudience: form.targetAudience,
      toneOfVoice: splitCsv(form.toneOfVoice),
      brandValues: splitCsv(form.brandValues),
      vocabularyDo: splitCsv(form.vocabularyDo),
      vocabularyDont: splitCsv(form.vocabularyDont),
      contentRules: form.contentRules.split('\n').map((line) => line.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className={steps.stepFormTight}>
      <h2 className={steps.stepHeading}>Tell us about your business</h2>
      <p className={steps.stepIntro}>This helps us configure your AI team to match your brand voice and target audience.</p>

      <Input label="Company Name" type="text" required value={form.companyName} onChange={set('companyName')} />
      <Input
        label="Industry"
        type="text"
        required
        value={form.industry}
        onChange={set('industry')}
        placeholder="e.g., B2B SaaS, E-commerce, Professional Services"
      />
      <Input
        label="Target Audience"
        type="text"
        required
        value={form.targetAudience}
        onChange={set('targetAudience')}
        placeholder="e.g., SMB founders, enterprise CTOs, marketing managers"
      />
      <Input
        label="Tone of Voice (comma-separated)"
        type="text"
        value={form.toneOfVoice}
        onChange={set('toneOfVoice')}
        placeholder="e.g., professional, warm, data-driven"
      />
      <Input
        label="Brand Values (comma-separated)"
        type="text"
        value={form.brandValues}
        onChange={set('brandValues')}
        placeholder="e.g., innovation, transparency, customer-first"
      />
      <Input
        label="Words/Phrases to Use (comma-separated)"
        type="text"
        value={form.vocabularyDo}
        onChange={set('vocabularyDo')}
      />
      <Input
        label="Words/Phrases to Avoid (comma-separated)"
        type="text"
        value={form.vocabularyDont}
        onChange={set('vocabularyDont')}
      />

      <label className={steps.field}>
        <span className={steps.fieldLabel}>Content Rules (one per line)</span>
        <textarea
          rows={3}
          value={form.contentRules}
          onChange={set('contentRules')}
          placeholder={'e.g., Always cite sources\nKeep blog posts under 1000 words'}
          className={steps.textarea}
        />
      </label>

      <Button type="submit" variant="primary" size="lg">Continue to Integrations</Button>
    </form>
  );
}
