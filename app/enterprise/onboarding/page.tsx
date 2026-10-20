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

const STEPS = ['Discovery', 'Integrations', 'Configuration', 'Go Live'];

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
  const [formData, setFormData] = useState({
    discovery: {} as any,
    integrations: {} as any,
    config: {} as any,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  /* The token lives next to the user in the auth context, not on the user
     object: `(user as any)?.token` sent `Bearer undefined`, so this flow
     never authenticated a single request. Same fix as the team pages. */
  const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const handleStartOnboarding = async () => {
    const res = await fetch(`${API_URL}/api/enterprise/onboarding/start`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ tenantId: user?.tenantId, templateId: `enterprise-sales-${tier}` }),
    });
    const data = await res.json();
    setDeploymentId(data.deploymentId);
  };

  const handleDiscoveryComplete = async (discovery: any) => {
    setFormData((prev) => ({ ...prev, discovery }));
    if (!deploymentId) await handleStartOnboarding();
    setCurrentStep(1);
  };

  const handleIntegrationsComplete = async (integrations: any) => {
    setFormData((prev) => ({ ...prev, integrations }));
    setCurrentStep(2);
  };

  const handleConfigComplete = async (config: any) => {
    setFormData((prev) => ({ ...prev, config }));
    setCurrentStep(3);
  };

  const handleDeploy = async () => {
    if (!deploymentId) return;
    await fetch(`${API_URL}/api/enterprise/onboarding/${deploymentId}/discovery`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(formData.discovery),
    });
    await fetch(`${API_URL}/api/enterprise/onboarding/${deploymentId}/integrations`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(formData.integrations),
    });
    await fetch(`${API_URL}/api/enterprise/onboarding/${deploymentId}/deploy`, {
      method: 'POST',
      headers: authHeaders(),
    });
    router.push('/dashboard/team');
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
        {currentStep === 0 && <DiscoveryStep onComplete={handleDiscoveryComplete} />}
        {currentStep === 1 && <IntegrationStep onComplete={handleIntegrationsComplete} />}
        {currentStep === 2 && <ConfigurationStep tier={tier} onComplete={handleConfigComplete} />}
        {currentStep === 3 && <GoLiveStep formData={formData} tier={tier} onDeploy={handleDeploy} />}
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
