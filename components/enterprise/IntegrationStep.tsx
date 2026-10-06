'use client';

import { useState } from 'react';
import steps from './EnterpriseSteps.module.css';

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
    <form onSubmit={handleSubmit} className={steps.stepForm}>
      <h2 className={steps.stepHeading}>Connect Your Tools</h2>
      <p className={steps.stepIntro}>Connect your existing CRM, email provider, and social accounts. You can skip any and configure later.</p>

      <fieldset className={steps.fieldset}>
        <legend className={steps.legend}>CRM</legend>
        <select value={form.crmProvider} onChange={(e) => setForm({ ...form, crmProvider: e.target.value })} className={steps.select}>
          <option value="">Select CRM...</option>
          <option value="hubspot">HubSpot</option>
          <option value="salesforce">Salesforce</option>
          <option value="pipedrive">Pipedrive</option>
          <option value="other">Other</option>
        </select>
        <input type="password" autoComplete="off" placeholder="API Key" value={form.crmApiKey} onChange={(e) => setForm({ ...form, crmApiKey: e.target.value })} className={steps.input} />
      </fieldset>

      <fieldset className={steps.fieldset}>
        <legend className={steps.legend}>Email Provider</legend>
        <select value={form.emailProvider} onChange={(e) => setForm({ ...form, emailProvider: e.target.value })} className={steps.select}>
          <option value="">Select provider...</option>
          <option value="sendgrid">SendGrid</option>
          <option value="mailgun">Mailgun</option>
          <option value="resend">Resend</option>
          <option value="smtp">Custom SMTP</option>
        </select>
        <input type="password" autoComplete="off" placeholder="API Key" value={form.emailApiKey} onChange={(e) => setForm({ ...form, emailApiKey: e.target.value })} className={steps.input} />
      </fieldset>

      <fieldset className={steps.fieldset}>
        <legend className={steps.legend}>Social Media</legend>
        <input type="text" placeholder="Platforms (comma-separated): linkedin, twitter, instagram" value={form.socialPlatforms} onChange={(e) => setForm({ ...form, socialPlatforms: e.target.value })} className={steps.input} />
      </fieldset>

      <fieldset className={steps.fieldset}>
        <legend className={steps.legend}>Analytics</legend>
        <select value={form.analyticsProvider} onChange={(e) => setForm({ ...form, analyticsProvider: e.target.value })} className={steps.select}>
          <option value="">Select provider...</option>
          <option value="google-analytics">Google Analytics</option>
          <option value="mixpanel">Mixpanel</option>
          <option value="plausible">Plausible</option>
        </select>
        <input type="text" placeholder="Tracking ID" value={form.analyticsTrackingId} onChange={(e) => setForm({ ...form, analyticsTrackingId: e.target.value })} className={steps.input} />
      </fieldset>

      <button type="submit" className={steps.submitButton}>Continue to Configuration</button>
    </form>
  );
}




