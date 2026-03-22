'use client';

import { useState, useEffect } from 'react';
import { fetchAgentConfig, updateAgentConfig, IAgent } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import styles from './Dashboard.module.css';

interface ConfigEditorProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

export default function ConfigEditor({ agent, open, onClose }: ConfigEditorProps) {
    const { toast } = useToast();
    const [configText, setConfigText] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && agent) {
            setLoading(true);
            setError('');
            fetchAgentConfig(agent.agentId)
                .then(config => setConfigText(JSON.stringify(config, null, 2)))
                .catch(() => setConfigText('// Failed to load config'))
                .finally(() => setLoading(false));
        }
    }, [open, agent]);

    const handleSave = async () => {
        if (!agent) return;
        setError('');

        // Validate JSON
        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(configText);
        } catch {
            setError('Invalid JSON — please fix syntax errors before saving.');
            return;
        }

        setSaving(true);
        try {
            await updateAgentConfig(agent.agentId, parsed);
            toast('Config saved — container restarting', 'success');
            onClose();
        } catch {
            toast('Failed to save config', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title={`Config — ${agent?.name || agent?.agentId || ''}`}>
            <div className={styles.memoryEditor}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Loading configuration…
                    </div>
                ) : (
                    <>
                        <textarea
                            className={styles.memoryTextarea}
                            value={configText}
                            onChange={(e) => { setConfigText(e.target.value); setError(''); }}
                            spellCheck={false}
                            style={{ fontFamily: 'monospace', fontSize: '12px', minHeight: '400px' }}
                        />
                        {error && (
                            <div className={styles.confirmWarning}>{error}</div>
                        )}
                        <div className={styles.memoryActions}>
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} loading={saving}>
                                Save & Restart
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
