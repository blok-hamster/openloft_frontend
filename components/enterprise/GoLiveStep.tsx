'use client';
import Button from '@/components/ui/Button';
import steps from './EnterpriseSteps.module.css';
import { roleLabel, tierLabel } from './roles';
import type { DiscoveryData } from './DiscoveryStep';
import type { IntegrationData } from './IntegrationStep';
import type { ConfigurationData } from './ConfigurationStep';

export interface EnterpriseFormData {
  discovery: Partial<DiscoveryData>;
  integrations: Partial<IntegrationData>;
  config: Partial<ConfigurationData>;
}

interface Props {
  formData: EnterpriseFormData;
  tier: string;
  onDeploy: () => void;
  deploying?: boolean;
}

export default function GoLiveStep({ formData, tier, onDeploy, deploying = false }: Props) {
  /* These were accessed as `discovery.companyName` with no guard, so an
     empty formData threw during render. */
  const discovery = formData.discovery ?? {};
  const integrations = formData.integrations ?? {};
  const config = formData.config ?? {};

  return (
    <div className={steps.reviewStack}>
      <h2 className={steps.stepHeading}>Review & Go Live</h2>
      <p className={steps.stepIntro}>
        Review your configuration below. Once deployed, your AI team will be live within 48 hours.
      </p>

      <section className={steps.reviewSection}>
        <h3 className={steps.reviewSectionTitle}>Brand</h3>
        <p className={steps.reviewLine}><strong>Company:</strong> {discovery.companyName}</p>
        <p className={steps.reviewLine}><strong>Industry:</strong> {discovery.industry}</p>
        <p className={steps.reviewLine}><strong>Target Audience:</strong> {discovery.targetAudience}</p>
        {discovery.toneOfVoice && discovery.toneOfVoice.length > 0 && (
          <p className={steps.reviewLine}><strong>Tone:</strong> {discovery.toneOfVoice.join(', ')}</p>
        )}
      </section>

      <section className={steps.reviewSection}>
        <h3 className={steps.reviewSectionTitle}>Integrations</h3>
        <p className={steps.reviewLine}>
          <strong>CRM:</strong> {integrations.crm?.provider || 'Not configured'}{' '}
          {integrations.crm?.connected ? '(Connected)' : ''}
        </p>
        <p className={steps.reviewLine}>
          <strong>Email:</strong> {integrations.email?.provider || 'Not configured'}{' '}
          {integrations.email?.connected ? '(Connected)' : ''}
        </p>
        <p className={steps.reviewLine}>
          <strong>Social:</strong> {integrations.social?.platforms?.join(', ') || 'Not configured'}
        </p>
        <p className={steps.reviewLine}>
          <strong>Analytics:</strong> {integrations.analytics?.provider || 'Not configured'}
        </p>
      </section>

      <section className={steps.reviewSection}>
        <h3 className={steps.reviewSectionTitle}>Team Configuration</h3>
        {/* These previously rendered raw values the user never saw during
            configuration: the tier id ("enterprise_custom") and snake_case
            role ids ("customer_success"). */}
        <p className={steps.reviewLine}>
          <strong>Plan:</strong> {tierLabel(tier)}
        </p>
        <p className={steps.reviewLine}>
          <strong>Agents:</strong>{' '}
          {config.selectedAgents?.length
            ? config.selectedAgents.map(roleLabel).join(', ')
            : 'None selected'}
        </p>
        <p className={steps.reviewLine}>
          <strong>LLM Provider:</strong> {config.llmProvider ?? 'Not set'}
        </p>
      </section>

      <div className={steps.reviewCallout}>
        <p className={steps.reviewCalloutText}>
          Your AI team will be deployed on dedicated infrastructure and operational within 48 hours.
        </p>
      </div>

      <Button
        type="button"
        variant="primary"
        size="lg"
        onClick={onDeploy}
        loading={deploying}
        disabled={deploying}
        className={steps.deployButton}
      >
        Deploy Team
      </Button>
    </div>
  );
}
