'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import DiscoveryStep from '@/components/enterprise/DiscoveryStep';
import IntegrationStep from '@/components/enterprise/IntegrationStep';
import ConfigurationStep from '@/components/enterprise/ConfigurationStep';
import GoLiveStep from '@/components/enterprise/GoLiveStep';
import styles from './Onboarding.module.css';
import FeatureGate from '@/components/FeatureGate';
import { publicApiBase } from '@/lib/publicApiBase';
import type { EnterpriseFormData } from '@/components/enterprise/GoLiveStep';

const STEPS = ['Discovery', 'Integrations', 'Configuration', 'Go Live'];

/** Read the envelope even when the response is an error page. `res.json()`
 *  on a gateway's HTML 502 throws a SyntaxError that reads like a client bug;
 *  the failure the user needs is the status or the `{ error }` the API sent. */
async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body; the status below carries the meaning */
  }
  if (!res.ok) {
    const message = (parsed as { error?: string } | null)?.error;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return parsed as T;
}

function EnterpriseOnboardingPageContent() {
  return (
    <Suspense fallback={<div />}>
      <EnterpriseOnboardingInner />
    </Suspense>
  );
}

function EnterpriseOnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier = searchParams.get('tier') || 'starter';
  const { user, token } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EnterpriseFormData>({
    discovery: {},
    integrations: {},
    config: {},
  });

  const API_URL = publicApiBase();

  /* The token lives next to the user in the auth context, not on the user
     object: `(user as any)?.token` sent `Bearer undefined`, so this flow
     never authenticated a single request. Same fix as the team pages. */
  const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const handleStartOnboarding = async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const data = await readJson<{ deploymentId: string }>(
        await fetch(`${API_URL}/enterprise/onboarding/start`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ tenantId: user?.tenantId, templateId: `enterprise-sales-${tier}` }),
        }),
      );
      setDeploymentId(data.deploymentId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start onboarding');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleDiscoveryComplete = async (discovery: EnterpriseFormData['discovery']) => {
    if (busy) return;
    setFormData((prev) => ({ ...prev, discovery }));
    /* Advancing without a deployment id used to strand the flow: every later
       step looked fine and Deploy did nothing. Fail here, visibly. */
    if (!deploymentId && !(await handleStartOnboarding())) return;
    setCurrentStep(1);
  };

  const handleIntegrationsComplete = async (integrations: EnterpriseFormData['integrations']) => {
    setFormData((prev) => ({ ...prev, integrations }));
    setCurrentStep(2);
  };

  const handleConfigComplete = async (config: EnterpriseFormData['config']) => {
    setFormData((prev) => ({ ...prev, config }));
    setCurrentStep(3);
  };

  const handleDeploy = async () => {
    if (busy) return;
    if (!deploymentId) {
      setError('Onboarding has not been started. Go back and retry the first step.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await readJson(
        await fetch(`${API_URL}/enterprise/onboarding/${deploymentId}/discovery`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(formData.discovery),
        }),
      );
      await readJson(
        await fetch(`${API_URL}/enterprise/onboarding/${deploymentId}/integrations`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(formData.integrations),
        }),
      );
      await readJson(
        await fetch(`${API_URL}/enterprise/onboarding/${deploymentId}/deploy`, {
          method: 'POST',
          headers: authHeaders(),
        }),
      );
      router.push('/dashboard/team');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.stepper}>
        {STEPS.map((step, i) => (
          <div key={step} className={`${styles.step} ${i <= currentStep ? styles.stepActive : ''}`}>
            <span className={styles.stepNumber}>{i + 1}</span>
            <span className={styles.stepLabel}>{step}</span>
          </div>
        ))}
      </div>

      <div className={styles.content}>
        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}
        {currentStep === 0 && <DiscoveryStep onComplete={handleDiscoveryComplete} />}
        {currentStep === 1 && <IntegrationStep onComplete={handleIntegrationsComplete} />}
        {currentStep === 2 && <ConfigurationStep tier={tier} onComplete={handleConfigComplete} />}
        {currentStep === 3 && (
          <GoLiveStep formData={formData} tier={tier} onDeploy={handleDeploy} deploying={busy} />
        )}
      </div>
    </div>
  );
}

export default function EnterpriseOnboardingPage() {
    return (
        <FeatureGate>
            <EnterpriseOnboardingPageContent />
        </FeatureGate>
    );
}
