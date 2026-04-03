'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useSearchParams } from 'next/navigation';
import { fetchAgents, getSkills, toggleSkill, uploadSkill, getPlugins, togglePlugin, uploadPlugin, IAgent, searchClawHub, installSkill, getSkillDetails, getSkillFileContent, getTrendingSkills, saveAgentSecret } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Toggle from '@/components/ui/Toggle';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import Modal from '@/components/ui/Modal';
import { Upload, Box, Cpu, Info, Search, Download, ShieldCheck, ShieldAlert, FileText, CheckCircle, ExternalLink, Code, Eye, Star, TrendingUp } from 'lucide-react';
import styles from '@/components/dashboard/Dashboard.module.css';

interface Extension {
    id: string;
    name: string;
    description?: string;
    version?: string;
    slug?: string;
    summary?: string;
    stats?: { stars: number; downloads: number };
}

type TabType = 'discover' | 'installed' | 'plugins';

export default function MarketplacePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState<TabType>('installed');
    const [agents, setAgents] = useState<IAgent[]>([]);
    const [skills, setSkills] = useState<Extension[]>([]);
    const [plugins, setPlugins] = useState<Extension[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [remoteResults, setRemoteResults] = useState<any[]>([]);
    const [trendingResults, setTrendingResults] = useState<any[]>([]);
    const [searchingRemote, setSearchingRemote] = useState(false);
    const [loadingTrending, setLoadingTrending] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);
    const [installConfirmSlug, setInstallConfirmSlug] = useState<string | null>(null);
    const [detailSlug, setDetailSlug] = useState<string | null>(null);
    const [detailData, setDetailData] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [previewFile, setPreviewFile] = useState<string | null>(null);
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [loadingContent, setLoadingContent] = useState(false);
    const [flockModalOpen, setFlockModalOpen] = useState(false);
    const [flockApiKey, setFlockApiKey] = useState('');
    const [savingFlockKey, setSavingFlockKey] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async () => {
        if (!user?.tenantId) return;
        try {
            const [agentData, skillData, pluginData] = await Promise.all([
                fetchAgents(user.tenantId),
                getSkills(),
                getPlugins(),
            ]);
            setAgents(agentData);
            setSkills(skillData as Extension[]);
            setPlugins(pluginData as Extension[]);
            if (agentData.length > 0 && !selectedAgent) {
                setSelectedAgent(agentData[0].agentId);
            }
        } catch {
            toast('Failed to load extensions', 'error');
        } finally {
            setLoading(false);
        }
    }, [user?.tenantId, selectedAgent, toast]);

    useEffect(() => {
        loadData();
        loadTrending();

        const installSlug = searchParams.get('install');
        if (installSlug) {
            setInstallConfirmSlug(installSlug);
            // Clean up URL without refreshing
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, [loadData, searchParams]);

    const loadTrending = async () => {
        setLoadingTrending(true);
        try {
            const data = await getTrendingSkills();
            setTrendingResults(data);
        } catch (err) {
            console.error('Failed to load trending skills', err);
        } finally {
            setLoadingTrending(false);
        }
    };

    const handleSearch = async (val: string) => {
        setSearchQuery(val);
        if (val.trim().length > 2) {
            setSearchingRemote(true);
            try {
                const results = await searchClawHub(val);
                setRemoteResults(results.map(r => ({
                    id: r.slug,
                    name: r.displayName || r.slug,
                    description: r.summary,
                    slug: r.slug,
                    version: r.version,
                    score: r.score
                })));
            } catch (err) {
                console.error('Remote search failed', err);
            } finally {
                setSearchingRemote(false);
            }
        } else {
            setRemoteResults([]);
        }
    };

    const handleOpenDetails = async (slug: string) => {
        setDetailSlug(slug);
        setLoadingDetails(true);
        setPreviewFile(null);
        setPreviewContent(null);
        try {
            const data = await getSkillDetails(slug);
            setDetailData(data);
        } catch (err) {
            toast('Failed to fetch skill details', 'error');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handlePreviewFile = async (filePath: string) => {
        if (!detailSlug) return;
        setPreviewFile(filePath);
        setLoadingContent(true);
        try {
            const content = await getSkillFileContent(detailSlug, filePath);
            setPreviewContent(content);
        } catch (err) {
            toast('Failed to load file content', 'error');
        } finally {
            setLoadingContent(false);
        }
    };

    const handleInstall = (slug: string) => {
        setInstallConfirmSlug(slug);
    };

    const executeInstall = async () => {
        if (!installConfirmSlug) return;
        const slug = installConfirmSlug;
        setInstalling(slug);
        setInstallConfirmSlug(null);
        try {
            await installSkill(slug);
            toast(`Skill ${slug} installed to registry`, 'success');
            await loadData();
            setSearchQuery('');
            setRemoteResults([]);
            setDetailSlug(null);
        } catch (err: any) {
            toast(`Installation failed: ${err.message}`, 'error');
        } finally {
            setInstalling(null);
        }
    };

    const currentAgent = agents.find((a) => a.agentId === selectedAgent);

    const handleToggle = async (extId: string, active: boolean, forced = false) => {
        if (!selectedAgent) {
            toast('Please select an agent first from the dropdown.', 'error');
            return;
        }

        // Custom handling for FLock plugin authentication
        if (activeTab === 'plugins' && extId === 'flock' && active && !forced) {
            setFlockModalOpen(true);
            return;
        }

        try {
            if (activeTab === 'discover' || activeTab === 'installed') {
                await toggleSkill(selectedAgent, extId, active);
                toast(`Skill ${active ? 'enabled' : 'disabled'} seamlessly`, 'success');
            } else {
                toast(`Applying plugin... Agent container will restart.`, 'info');
                await togglePlugin(selectedAgent, extId, active);
                toast(`Plugin ${active ? 'activated' : 'deactivated'}. Agent is restarting.`, 'success');
            }
            loadData();
        } catch (err: any) {
            toast(`Failed to toggle: ${err.message}`, 'error');
        }
    };

    const handleFlockAuth = async () => {
        if (!flockApiKey) {
            toast('Please enter a valid FLock API Key', 'error');
            return;
        }
        setSavingFlockKey(true);
        try {
            await saveAgentSecret(selectedAgent, 'FLOCK_API_KEY', flockApiKey);
            setFlockModalOpen(false);
            // Now actually toggle it on using the forced flag to avoid loop
            await handleToggle('flock', true, true);
        } catch (err: any) {
            toast(`Failed to save FLock key: ${err.message}`, 'error');
        } finally {
            setSavingFlockKey(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            if (activeTab === 'discover' || activeTab === 'installed') {
                await uploadSkill(file);
            } else {
                await uploadPlugin(file);
            }
            toast(`Custom ${activeTab === 'plugins' ? 'plugin' : 'skill'} imported successfully`, 'success');
            loadData();
        } catch (err: any) {
            toast(err.message || `Failed to import custom file`, 'error');
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
                        <h1 className={styles.headerTitle}>Marketplace</h1>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <SkeletonLoader variant="card" count={4} />
                </div>
            </>
        );
    }

    const itemsToShow = activeTab === 'plugins' ? plugins : skills;
    const filteredLocal = itemsToShow.filter(i => 
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        i.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <div className={styles.dashboardHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.headerTitle}>Unified Marketplace</h1>
                    <span className={styles.headerSubtitle}>Discover and manage agent extensions</span>
                </div>
                <div className={styles.headerActions} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ position: 'relative', width: '240px' }}>
                        <Input 
                            placeholder="Search ClawHub..." 
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                    <input
                        type="file"
                        accept=".zip,.json"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                    <Button 
                        variant="secondary" 
                        icon={<Upload size={14} />} 
                        onClick={() => fileInputRef.current?.click()}
                        loading={uploading}
                    >
                        Import
                    </Button>
                    <Select
                        label="Agent"
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        options={agents.map((a) => ({ value: a.agentId, label: a.agentId }))}
                    />
                </div>
            </div>

            <div className={styles.memoryTabs} style={{ marginBottom: '1.5rem' }}>
                <button 
                    className={`${styles.memoryTab} ${activeTab === 'discover' ? styles.memoryTabActive : ''}`}
                    onClick={() => setActiveTab('discover')}
                >
                    <Search size={14} />
                    Discover Skills
                </button>
                <button 
                    className={`${styles.memoryTab} ${activeTab === 'installed' ? styles.memoryTabActive : ''}`}
                    onClick={() => setActiveTab('installed')}
                >
                    <Cpu size={14} />
                    Installed ({skills.length})
                </button>
                <button 
                    className={`${styles.memoryTab} ${activeTab === 'plugins' ? styles.memoryTabActive : ''}`}
                    onClick={() => setActiveTab('plugins')}
                >
                    <Box size={14} />
                    Plugins ({plugins.length})
                </button>
            </div>

            {searchQuery.trim().length > 2 && activeTab === 'discover' && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 className={styles.agentName} style={{ marginBottom: '1rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Search size={16} /> Discovery Results (ClawHub)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {searchingRemote ? (
                            <SkeletonLoader variant="card" count={2} />
                        ) : remoteResults.length > 0 ? (
                            remoteResults.map(res => {
                                const isInstalled = skills.some(s => s.id === res.slug);
                                return (
                                    <Card key={res.slug}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '40px', height: '40px', background: 'rgba(39, 121, 255, 0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
                                                    <Download size={20} />
                                                </div>
                                                 <div>
                                                    <div className={styles.agentName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {res.displayName || res.name} 
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '10px', marginLeft: '0.5rem' }}>
                                                            <span style={{ color: '#FFB800', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                <Star size={10} fill={res.stats?.stars > 0 ? "#FFB800" : "none"} /> {res.stats?.stars || 0}
                                                            </span>
                                                            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                <Download size={10} /> {res.stats?.downloads ? (res.stats.downloads > 1000 ? (res.stats.downloads/1000).toFixed(1)+'k' : res.stats.downloads) : 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.agentMetaItem}>{res.summary || res.description}</div>
                                                </div>
                                             </div>
                                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => handleOpenDetails(res.slug!)}
                                                >
                                                    Details
                                                </Button>
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm"
                                                    disabled={isInstalled}
                                                    loading={installing === res.slug}
                                                    onClick={() => handleInstall(res.slug!)}
                                                >
                                                    {isInstalled ? 'Installed' : 'Install'}
                                                </Button>
                                             </div>
                                        </div>
                                    </Card>
                                );
                            })
                        ) : (
                            <div className={styles.emptyState} style={{ padding: '2rem' }}>
                                <div className={styles.emptyDescription}>No matching skills found on ClawHub.</div>
                            </div>
                        )}
                     </div>
                </div>
            )}

            {searchQuery.trim().length <= 2 && activeTab === 'discover' && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 className={styles.agentName} style={{ marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                        <TrendingUp size={18} style={{ color: '#ff4b4b' }} /> Trending Now
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {loadingTrending ? (
                            <SkeletonLoader variant="card" count={3} />
                        ) : trendingResults.length > 0 ? (
                            trendingResults.map(res => {
                                const isInstalled = skills.some(s => s.id === res.slug);
                                return (
                                    <Card key={res.slug}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '40px', height: '40px', background: 'rgba(255, 75, 75, 0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4b4b' }}>
                                                    <Download size={20} />
                                                </div>
                                                <div>
                                                    <div className={styles.agentName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {res.displayName} 
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '10px', marginLeft: '0.5rem' }}>
                                                            <span style={{ color: '#FFB800', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                <Star size={10} fill={res.stats?.stars > 0 ? "#FFB800" : "none"} /> {res.stats?.stars || 0}
                                                            </span>
                                                            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                <Download size={10} /> {res.stats?.downloads ? (res.stats.downloads > 1000 ? (res.stats.downloads/1000).toFixed(1)+'k' : res.stats.downloads) : 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.agentMetaItem}>{res.summary}</div>
                                                </div>
                                             </div>
                                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => handleOpenDetails(res.slug)}
                                                >
                                                    Details
                                                </Button>
                                                <Button 
                                                    variant="primary" 
                                                    size="sm"
                                                    disabled={isInstalled || installing === res.slug}
                                                    onClick={() => handleInstall(res.slug)}
                                                >
                                                    {isInstalled ? <CheckCircle size={14} /> : (installing === res.slug ? 'Installing...' : 'Install')}
                                                </Button>
                                             </div>
                                        </div>
                                    </Card>
                                );
                            })
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No trending skills found at the moment.</div>
                        )}
                    </div>
                </div>
            )}

            {detailSlug && (
                <Modal 
                    open={!!detailSlug} 
                    onClose={() => { setDetailSlug(null); setDetailData(null); setPreviewFile(null); setPreviewContent(null); }}
                    title={`Skill Inspection: ${detailSlug}`}
                >
                    {loadingDetails ? (
                        <div style={{ padding: '2rem' }}><SkeletonLoader variant="card" count={3} /></div>
                    ) : detailData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ padding: '1rem', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', background: 'rgba(255,255,255,0.5)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {detailData.displayName}
                                        <span style={{ fontSize: '12px', opacity: 0.5, fontWeight: 400 }}>{detailData.slug}</span>
                                    </div>
                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                            <Star size={14} fill={detailData.stats?.stars > 0 ? "#FFB800" : "none"} color={detailData.stats?.stars > 0 ? "#FFB800" : "currentColor"} /> 
                                            <strong>{detailData.stats?.stars || 0}</strong> stars
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                            <Download size={14} /> 
                                            <strong>{detailData.stats?.downloads?.toLocaleString() || 0}</strong> downloads
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.agentMetaItem} style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>{detailData.summary}</div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                                     <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <ShieldCheck size={16} /> Status:
                                        <span style={{ color: detailData.latestVersion?.llmAnalysis?.verdict === 'safe' ? 'var(--accent-blue)' : '#ff4b4b' }}>
                                            {detailData.latestVersion?.llmAnalysis?.verdict?.toUpperCase() || 'UNKNOWN'}
                                        </span>
                                     </div>
                                </div>
                            </div>

                            <div>
                        <div className={styles.sectionHeader} style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldAlert size={18} /> Deep Security Scan
                        </div>
                        
                        {detailData.latestVersion?.llmAnalysis ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: detailData.latestVersion.llmAnalysis.verdict === 'safe' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(234, 179, 8, 0.08)', borderRadius: '12px', border: `1px solid ${detailData.latestVersion.llmAnalysis.verdict === 'safe' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.2)'}` }}>
                                    <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: detailData.latestVersion.llmAnalysis.verdict === 'safe' ? '#22c55e' : '#b25e00', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {detailData.latestVersion.llmAnalysis.verdict === 'safe' ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                                        Security Verdict: {detailData.latestVersion.llmAnalysis.verdict?.toUpperCase()}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', lineHeight: '1.5', opacity: 0.8 }}>{detailData.latestVersion.llmAnalysis.summary}</div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                    {detailData.latestVersion.llmAnalysis.dimensions?.map((dim: any, i: number) => (
                                        <div key={i} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{dim.label}</div>
                                                <span style={{ 
                                                    fontSize: '9px', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px', 
                                                    background: dim.rating === 'ok' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                                    color: dim.rating === 'ok' ? '#22c55e' : '#b25e00'
                                                }}>
                                                    {dim.rating?.toUpperCase()}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.7, lineHeight: '1.4' }}>{dim.detail}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ padding: '1rem', background: 'rgba(39, 121, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(39, 121, 255, 0.1)' }}>
                                    <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                        <Info size={16} /> Technical Guidance
                                    </div>
                                    <div style={{ fontSize: '0.85rem', lineHeight: '1.5', opacity: 0.9 }}>{detailData.latestVersion.llmAnalysis.guidance}</div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, border: '1px dashed rgba(0,0,0,0.1)', borderRadius: '12px' }}>
                                No deep security scan available for this version.
                            </div>
                        )}
                    </div>

                            <div>
                                <div className={styles.sectionHeader} style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={18} /> File Manifest
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: previewFile ? '250px 1fr' : '1fr', gap: '1rem' }}>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '6px' }}>
                                        {detailData.files?.map((f: any, i: number) => (
                                            <div 
                                                key={i} 
                                                onClick={() => handlePreviewFile(f.path)}
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between', 
                                                    padding: '0.5rem 0.75rem', 
                                                    background: previewFile === f.path ? 'rgba(39, 121, 255, 0.08)' : (i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)'),
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    borderLeft: previewFile === f.path ? '3px solid var(--accent-blue)' : 'none'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Code size={14} style={{ opacity: 0.5 }} />
                                                    <code style={{ color: previewFile === f.path ? 'var(--accent-blue)' : 'inherit' }}>{f.path}</code>
                                                </div>
                                                <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>{(f.size / 1024).toFixed(1)} KB</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {previewFile && (
                                        <div style={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span>Previewing: {previewFile}</span>
                                                <Button variant="ghost" size="sm" style={{ height: '20px', fontSize: '10px' }} onClick={() => setPreviewFile(null)}>Close</Button>
                                            </div>
                                            <div style={{ flex: 1, maxHeight: '250px', overflowY: 'auto' }}>
                                                {loadingContent ? (
                                                    <div style={{ padding: '2rem', textAlign: 'center' }}><SkeletonLoader count={5} /></div>
                                                ) : (
                                                    <pre style={{ margin: 0, padding: '1rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#333' }}>
                                                        {previewContent}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                <a 
                                    href={`https://clawhub.ai/sit-in/${detailSlug}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                    View full details on ClawHub <ExternalLink size={12} />
                                </a>
                            </div>
                        </div>
                    ) : null}
                </Modal>
            )}

            {flockModalOpen && (
                <Modal
                    open={flockModalOpen}
                    onClose={() => setFlockModalOpen(false)}
                    title="FLock-io Authentication"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ padding: '1.25rem', background: 'rgba(39, 121, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(39, 121, 255, 0.1)' }}>
                            <div style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShieldCheck size={18} /> Provider Authentication
                            </div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8, lineHeight: '1.5' }}>
                                To use the FLock decentralised AI models, you must provide your <strong>FLock API Key</strong>. 
                                This key will be stored securely in your agent's private Vault.
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>FLock API Key</label>
                            <Input 
                                type="password"
                                placeholder="Enter your flock-api-key"
                                value={flockApiKey}
                                onChange={(e) => setFlockApiKey(e.target.value)}
                            />
                            <a 
                                href="https://beta.flock.io/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', textAlign: 'right' }}
                            >
                                Get a key from the FLock Dashboard →
                            </a>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <Button variant="ghost" onClick={() => setFlockModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                onClick={handleFlockAuth}
                                loading={savingFlockKey}
                            >
                                Save Key & Activate Plugin
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {installConfirmSlug && (
                <Modal
                    open={!!installConfirmSlug}
                    onClose={() => setInstallConfirmSlug(null)}
                    title="Security Warning: Third-Party Skill"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ 
                            padding: '1.25rem', 
                            background: 'rgba(255, 75, 75, 0.05)', 
                            border: '1px solid rgba(255, 75, 75, 0.1)', 
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                        }}>
                            <div style={{ fontWeight: 700, color: '#ff4b4b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShieldAlert size={20} /> Execution Risks
                            </div>
                            <div style={{ fontSize: '0.9rem', lineHeight: '1.5', opacity: 0.9 }}>
                                You are about to install <strong>{installConfirmSlug}</strong>. 
                                This skill was developed by a third party and will have permission to:
                            </div>
                            <ul style={{ fontSize: '0.85rem', paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <li>Execute code within your agent's secure container</li>
                                <li>Access environment variables and configured API keys</li>
                                <li>Interact with your linked social channels (if permitted by code)</li>
                            </ul>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem' }}>
                                Ensure you have reviewed the code manifest and the LLM Security Scan before proceeding.
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <Button variant="ghost" onClick={() => setInstallConfirmSlug(null)}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={executeInstall}>
                                I Understand, Install Skill
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {activeTab === 'plugins' && (
                <div className={styles.provisioningBanner} style={{ marginBottom: '1rem' }}>
                    <Info size={14} />
                    <span>Activating or deactivating plugins requires an agent restart to re-map container volumes.</span>
                </div>
            )}

            {(activeTab === 'installed' || activeTab === 'plugins') && (
                <>
                    <h3 className={styles.agentName} style={{ marginBottom: '1rem' }}>
                        {searchQuery ? 'Local Results' : `Installed ${activeTab === 'plugins' ? 'Plugins' : 'Skills'}`}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filteredLocal.map((item) => {
                            const isActive = activeTab !== 'plugins' 
                                ? currentAgent?.activeSkills.includes(item.id) 
                                : currentAgent?.activePlugins.includes(item.id);
                            return (
                                <Card key={item.id}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ 
                                                width: '40px', 
                                                height: '40px', 
                                                background: 'rgba(26, 26, 26, 0.04)', 
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                {activeTab === 'installed' ? <Cpu size={20} /> : <Box size={20} />}
                                            </div>
                                            <div>
                                                <div className={styles.agentName}>{item.name || item.id}</div>
                                                {item.description && (
                                                    <div className={styles.agentMetaItem} style={{ marginTop: '0.25rem' }}>
                                                        {item.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Toggle
                                            checked={isActive || false}
                                            disabled={!selectedAgent}
                                            onChange={(checked) => handleToggle(item.id, checked)}
                                        />
                                    </div>
                                </Card>
                            );
                        })}

                        {filteredLocal.length === 0 && (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyTitle}>No {activeTab} available</div>
                                <div className={styles.emptyDescription}>
                                    {activeTab === 'installed' 
                                        ? "Skills are lightweight logic blocks that can be injected at runtime."
                                        : "Plugins are robust extensions that require container-level mounting."}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    );
}
