'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import styles from './TeamSettings.module.css';

export default function TeamSettingsPage() {
  const { token } = useAuth();
  const [styleGuide, setStyleGuide] = useState<any>({});
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /* Errors surface here instead of dying in the console: a failed load used
     to read exactly like an unset guide. */
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  /* The token lives beside the user in the auth context, not on the user
     object — `(user as any)?.token` sent `Bearer undefined` on every call. */
  const authHeaders = (): HeadersInit =>
    token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/teams`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`team lookup failed (${res.status})`);
      const deployments = await res.json();
      if (deployments.length > 0) {
        setDeploymentId(deployments[0].deploymentId);
        const guideRes = await fetch(`${API_URL}/api/teams/${deployments[0].deploymentId}/style-guide`, {
          headers: authHeaders(),
        });
        if (!guideRes.ok) throw new Error(`style guide failed (${guideRes.status})`);
        const guide = await guideRes.json();
        setStyleGuide(guide);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError('Failed to load your team settings. Check your connection and try again.');
    }
  };

  const handleSave = async () => {
    if (!deploymentId) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${API_URL}/api/teams/${deploymentId}/style-guide`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(styleGuide),
      });
      if (!res.ok) throw new Error(`save failed (${res.status})`);
      setSaved(true);
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save the style guide. Check your connection and try again.');
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

        {error && (
          <p className={styles.sectionNote} role="alert" style={{ color: '#b91c1c' }}>
            {error}{' '}
            <button type="button" onClick={fetchSettings} className={styles.saveButton}>
              Retry
            </button>
          </p>
        )}

        <button type="button" onClick={handleSave} disabled={saving} className={styles.saveButton}>
          {saving ? 'Saving...' : 'Save Style Guide'}
        </button>
        {saved && !saving && (
          <p className={styles.sectionNote} aria-live="polite">
            Style guide saved.
          </p>
        )}
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
