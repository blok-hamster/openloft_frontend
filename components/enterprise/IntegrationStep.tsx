'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import steps from './EnterpriseSteps.module.css';

export interface IntegrationData {
  crm: { provider: string; apiKey: string; connected: boolean };
  email: { provider: string; apiKey: string; connected: boolean };
  social: { platforms: string[]; connected: boolean };
  analytics: { provider: string; trackingId: string; connected: boolean };
}

interface Props {
  onComplete: (data: IntegrationData) => void;
}

const CRM_OPTIONS = [
  { value: '', label: 'Select CRM...' },
  { value: 'hubspot', label: 'HubSpot' },
  { value: 'salesforce', label: 'Salesforce' },
  { value: 'pipedrive', label: 'Pipedrive' },
  { value: 'other', label: 'Other' },
];

const EMAIL_OPTIONS = [
  { value: '', label: 'Select provider...' },
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'mailgun', label: 'Mailgun' },
  { value: 'resend', label: 'Resend' },
  { value: 'smtp', label: 'Custom SMTP' },
];

const ANALYTICS_OPTIONS = [
  { value: '', label: 'Select provider...' },
  { value: 'google-analytics', label: 'Google Analytics' },
  { value: 'mixpanel', label: 'Mixpanel' },
  { value: 'plausible', label: 'Plausible' },
];

/**
 * Step two. Kit fields, so a provider picker behaves like every other
 * picker in the product and the API-key inputs get the kit's paste and
 * autocomplete posture instead of a bare styled input.
 */
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

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      crm: { provider: form.crmProvider, apiKey: form.crmApiKey, connected: !!form.crmApiKey },
      email: { provider: form.emailProvider, apiKey: form.emailApiKey, connected: !!form.emailApiKey },
      social: {
        platforms: form.socialPlatforms.split(',').map((part) => part.trim()).filter(Boolean),
        connected: !!form.socialPlatforms,
      },
      analytics: { provider: form.analyticsProvider, trackingId: form.analyticsTrackingId, connected: !!form.analyticsTrackingId },
    });
  };

  return (
    <form onSubmit={handleSubmit} className={steps.stepForm}>
      <h2 className={steps.stepHeading}>Connect Your Tools</h2>
      <p className={steps.stepIntro}>Connect your existing CRM, email provider, and social accounts. You can skip any and configure later.</p>

      <fieldset className={steps.fieldset}>
        <legend className={steps.legend}>CRM</legend>
        <Select label="Provider" options={CRM_OPTIONS} value={form.crmProvider} onChange={set('crmProvider')} />
        <Input
          label="API Key"
          type="password"
          autoComplete="off"
          placeholder="API Key"
          value={form.crmApiKey}
          onChange={set('crmApiKey')}
        />
      </fieldset>

      <fieldset className={steps.fieldset}>
        <legend className={steps.legend}>Email Provider</legend>
        <Select label="Provider" options={EMAIL_OPTIONS} value={form.emailProvider} onChange={set('emailProvider')} />
        <Input
          label="API Key"
          type="password"
          autoComplete="off"
          placeholder="API Key"
          value={form.emailApiKey}
          onChange={set('emailApiKey')}
        />
      </fieldset>

      <fieldset className={steps.fieldset}>
        <legend className={steps.legend}>Social Media</legend>
        <Input
          label="Platforms (comma-separated)"
          type="text"
          placeholder="linkedin, twitter, instagram"
          value={form.socialPlatforms}
          onChange={set('socialPlatforms')}
        />
      </fieldset>

      <fieldset className={steps.fieldset}>
        <legend className={steps.legend}>Analytics</legend>
        <Select label="Provider" options={ANALYTICS_OPTIONS} value={form.analyticsProvider} onChange={set('analyticsProvider')} />
        <Input
          label="Tracking ID"
          type="text"
          placeholder="Tracking ID"
          value={form.analyticsTrackingId}
          onChange={set('analyticsTrackingId')}
        />
      </fieldset>

      <Button type="submit" variant="primary" size="lg">Continue to Configuration</Button>
    </form>
  );
}
