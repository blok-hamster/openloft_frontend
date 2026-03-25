'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { fetchAgents, getSkills, toggleSkill, uploadSkill, IAgent } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Toggle from '@/components/ui/Toggle';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { Upload } from 'lucide-react';
import styles from '@/components/dashboard/Dashboard.module.css';

interface Skill {
    id: string;
    name: string;
    description?: string;
}

export default function SkillsPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [agents, setAgents] = useState<IAgent[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async () => {
        if (!user?.tenantId) return;
        try {
            const [agentData, skillData] = await Promise.all([
                fetchAgents(user.tenantId),
                getSkills(),
            ]);
            setAgents(agentData);
            setSkills(skillData as Skill[]);
            if (agentData.length > 0 && !selectedAgent) {
                setSelectedAgent(agentData[0].agentId);
            }
        } catch {
            toast('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    }, [user?.tenantId, selectedAgent, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const currentAgent = agents.find((a) => a.agentId === selectedAgent);

    const handleToggle = async (skillId: string, active: boolean) => {
        if (!selectedAgent) return;
        try {
            await toggleSkill(selectedAgent, skillId, active);
            toast(`Skill ${active ? 'enabled' : 'disabled'} seamlessly`, 'success');
            loadData();
        } catch {
            toast('Failed to toggle skill', 'error');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            await uploadSkill(file);
            toast('Custom skill imported successfully', 'success');
            loadData(); // Formally trigger API re-scan of registry organically
        } catch (err: any) {
            toast(err.message || 'Failed to import custom skill', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading) {
        return (
            <>
                <div className={styles.dashboardHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.headerTitle}>Skills</h1>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <SkeletonLoader variant="card" count={4} />
                </div>
            </>
        );
    }

    return (
        <>
            <div className={styles.dashboardHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.headerTitle}>Skills Marketplace</h1>
                    <span className={styles.headerSubtitle}>{skills.length} skills available</span>
                </div>
                <div className={styles.headerActions} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                        type="file"
                        accept=".zip,.json"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        <Button 
                            variant="secondary" 
                            icon={<Upload size={14} />} 
                            onClick={() => fileInputRef.current?.click()}
                            loading={uploading}
                            disabled={process.env.NEXT_PUBLIC_NODE_ENV === 'prod'}
                            title={process.env.NEXT_PUBLIC_NODE_ENV === 'prod' ? "Coming soon" : ""}
                        >
                            Import Custom Skill
                        </Button>
                        {process.env.NEXT_PUBLIC_NODE_ENV === 'prod' && (
                            <span style={{ fontSize: '10px', color: 'var(--accent-coral)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                COMING SOON: UNDER CONSTRUCTION
                            </span>
                        )}
                    </div>
                    <Select
                        label="Agent"
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        options={agents.map((a) => ({ value: a.agentId, label: a.agentId }))}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {skills.map((skill) => {
                    const isActive = currentAgent?.activeSkills.includes(skill.id) || false;
                    return (
                        <Card key={skill.id}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div className={styles.agentName}>{skill.name || skill.id}</div>
                                    {skill.description && (
                                        <div className={styles.agentMetaItem} style={{ marginTop: '0.25rem' }}>
                                            {skill.description}
                                        </div>
                                    )}
                                </div>
                                <Toggle
                                    checked={isActive}
                                    onChange={(checked) => handleToggle(skill.id, checked)}
                                />
                            </div>
                        </Card>
                    );
                })}

                {skills.length === 0 && (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyTitle}>No skills available</div>
                        <div className={styles.emptyDescription}>
                            Skills will appear here once they are uploaded to the registry.
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
