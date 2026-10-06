'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import styles from './TeamSettings.module.css';

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
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Team Settings</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Brand Style Guide</h2>

        <div className={styles.fieldStack}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Company Name</span>
            <input type="text" value={styleGuide.companyName || ''} onChange={(e) => setStyleGuide({ ...styleGuide, companyName: e.target.value })} className={styles.fieldInput} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Industry</span>
            <input type="text" value={styleGuide.industry || ''} onChange={(e) => setStyleGuide({ ...styleGuide, industry: e.target.value })} className={styles.fieldInput} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Target Audience</span>
            <input type="text" value={styleGuide.targetAudience || ''} onChange={(e) => setStyleGuide({ ...styleGuide, targetAudience: e.target.value })} className={styles.fieldInput} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Tone of Voice (comma-separated)</span>
            <input type="text" value={(styleGuide.toneOfVoice || []).join(', ')} onChange={(e) => setStyleGuide({ ...styleGuide, toneOfVoice: e.target.value.split(',').map((s: string) => s.trim()) })} className={styles.fieldInput} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Content Rules (one per line)</span>
            <textarea rows={4} value={(styleGuide.contentRules || []).join('\n')} onChange={(e) => setStyleGuide({ ...styleGuide, contentRules: e.target.value.split('\n') })} className={styles.fieldTextarea} />
          </label>
        </div>

        <button onClick={handleSave} disabled={saving} className={styles.saveButton}>
          {saving ? 'Saving...' : 'Save Style Guide'}
        </button>
      </section>

      <section className={styles.sectionLast}>
        <h2 className={styles.sectionTitleSm}>Triggers & Schedules</h2>
        <p className={styles.sectionNote}>
          Behavioral triggers and report schedules can be configured via the API or will be managed in a future dashboard update.
        </p>
      </section>
    </div>
  );
}
