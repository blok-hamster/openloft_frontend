'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
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
import marketplace from './Marketplace.module.css';

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

function MarketplaceContent() {
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
                <div className={marketplace.stackLg}>
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
                <div className={styles.headerActions}>
                    <div className={marketplace.searchWrap}>
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
                        className={marketplace.hiddenInput}
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

            <div className={`${styles.memoryTabs} ${marketplace.tabsSpaced}`}>
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
                <div className={marketplace.sectionBlock}>
                    <h3 className={`${styles.agentName} ${marketplace.sectionHeadingBlue}`}>
                        <Search size={16} /> Discovery Results (ClawHub)
                    </h3>
                    <div className={marketplace.stack}>
                        {searchingRemote ? (
                            <SkeletonLoader variant="card" count={2} />
                        ) : remoteResults.length > 0 ? (
                            remoteResults.map(res => {
                                const isInstalled = skills.some(s => s.id === res.slug);
                                return (
                                    <Card key={res.slug}>
                                        <div className={marketplace.resultRow}>
                                             <div className={marketplace.resultMain}>
                                                <div className={marketplace.iconTileBlue}>
                                                    <Download size={20} />
                                                </div>
                                                <div className={marketplace.resultText}>
                                                    <div className={`${styles.agentName} ${marketplace.resultNameRow}`}>
                                                        {res.displayName || res.name}
                                                        <div className={marketplace.resultStats}>
                                                            <span className={marketplace.statStar}>
                                                                <Star size={10} fill={res.stats?.stars > 0 ? "#FFB800" : "none"} /> {res.stats?.stars || 0}
                                                            </span>
                                                            <span className={marketplace.statDownload}>
                                                                <Download size={10} /> {res.stats?.downloads ? (res.stats.downloads > 1000 ? (res.stats.downloads/1000).toFixed(1)+'k' : res.stats.downloads) : 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.agentMetaItem}>{res.summary || res.description}</div>
                                                </div>
                                             </div>
                                             <div className={marketplace.resultActions}>
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
                            <div className={`${styles.emptyState} ${marketplace.emptyPadded}`}>
                                <div className={styles.emptyDescription}>No matching skills found on ClawHub.</div>
                            </div>
                        )}
                     </div>
                </div>
            )}

            {searchQuery.trim().length <= 2 && activeTab === 'discover' && (
                <div className={marketplace.sectionBlock}>
                    <h3 className={`${styles.agentName} ${marketplace.sectionHeadingLg}`}>
                        <TrendingUp size={18} style={{ color: '#ff4b4b' }} /> Trending Now
                    </h3>
                    <div className={marketplace.stack}>
                        {loadingTrending ? (
                            <SkeletonLoader variant="card" count={3} />
                        ) : trendingResults.length > 0 ? (
                            trendingResults.map(res => {
                                const isInstalled = skills.some(s => s.id === res.slug);
                                return (
                                    <Card key={res.slug}>
                                        <div className={marketplace.resultRow}>
                                             <div className={marketplace.resultMain}>
                                                <div className={marketplace.iconTileRed}>
                                                    <Download size={20} />
                                                </div>
                                                <div className={marketplace.resultText}>
                                                    <div className={`${styles.agentName} ${marketplace.resultNameRow}`}>
                                                        {res.displayName}
                                                        <div className={marketplace.resultStats}>
                                                            <span className={marketplace.statStar}>
                                                                <Star size={10} fill={res.stats?.stars > 0 ? "#FFB800" : "none"} /> {res.stats?.stars || 0}
                                                            </span>
                                                            <span className={marketplace.statDownload}>
                                                                <Download size={10} /> {res.stats?.downloads ? (res.stats.downloads > 1000 ? (res.stats.downloads/1000).toFixed(1)+'k' : res.stats.downloads) : 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.agentMetaItem}>{res.summary}</div>
                                                </div>
                                             </div>
                                             <div className={marketplace.resultActions}>
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
                            <div className={marketplace.centerNote}>No trending skills found at the moment.</div>
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
                        <div className={marketplace.emptyPadded}><SkeletonLoader variant="card" count={3} /></div>
                    ) : detailData ? (
                        <div className={marketplace.stackXl}>
                            <div className={marketplace.detailCard}>
                                <div className={marketplace.detailHeader}>
                                    <div className={marketplace.detailTitle}>
                                        {detailData.displayName}
                                        <span className={marketplace.detailSlug}>{detailData.slug}</span>
                                    </div>
                                    <div className={marketplace.detailStats}>
                                        <div className={marketplace.detailStat}>
                                            <Star size={14} fill={detailData.stats?.stars > 0 ? "#FFB800" : "none"} color={detailData.stats?.stars > 0 ? "#FFB800" : "currentColor"} />
                                            <strong>{detailData.stats?.stars || 0}</strong> stars
                                        </div>
                                        <div className={marketplace.detailStat}>
                                            <Download size={14} />
                                            <strong>{detailData.stats?.downloads?.toLocaleString() || 0}</strong> downloads
                                        </div>
                                    </div>
                                </div>

                                <div className={`${styles.agentMetaItem} ${marketplace.detailSummary}`}>{detailData.summary}</div>

                                <div className={marketplace.statusStrip}>
                                     <div className={marketplace.statusStripLabel}>
                                        <ShieldCheck size={16} /> Status:
                                        <span className={detailData.latestVersion?.llmAnalysis?.verdict === 'safe' ? marketplace.statusValueSafe : marketplace.statusValue}>
                                            {detailData.latestVersion?.llmAnalysis?.verdict?.toUpperCase() || 'UNKNOWN'}
                                        </span>
                                     </div>
                                </div>
                            </div>

                            <div>
                        <div className={`${styles.sectionHeader} ${marketplace.headingSm}`}>
                            <ShieldAlert size={18} /> Deep Security Scan
                        </div>

                        {detailData.latestVersion?.llmAnalysis ? (
                            <div className={marketplace.stack}>
                                <div className={detailData.latestVersion.llmAnalysis.verdict === 'safe' ? marketplace.verdictBoxSafe : marketplace.verdictBoxWarn}>
                                    <div className={detailData.latestVersion.llmAnalysis.verdict === 'safe' ? marketplace.verdictTitleSafe : marketplace.verdictTitleWarn}>
                                        {detailData.latestVersion.llmAnalysis.verdict === 'safe' ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                                        Security Verdict: {detailData.latestVersion.llmAnalysis.verdict?.toUpperCase()}
                                    </div>
                                    <div className={marketplace.prose}>{detailData.latestVersion.llmAnalysis.summary}</div>
                                </div>

                                <div className={marketplace.dimGrid}>
                                    {detailData.latestVersion.llmAnalysis.dimensions?.map((dim: any, i: number) => (
                                        <div key={i} className={marketplace.dimCard}>
                                            <div className={marketplace.dimHead}>
                                                <div className={marketplace.dimLabel}>{dim.label}</div>
                                                <span className={dim.rating === 'ok' ? marketplace.dimBadgeOk : marketplace.dimBadgeWarn}>
                                                    {dim.rating?.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className={marketplace.dimDetail}>{dim.detail}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className={marketplace.guidanceBox}>
                                    <div className={marketplace.guidanceTitle}>
                                        <Info size={16} /> Technical Guidance
                                    </div>
                                    <div className={marketplace.guidanceBody}>{detailData.latestVersion.llmAnalysis.guidance}</div>
                                </div>
                            </div>
                        ) : (
                            <div className={marketplace.noScan}>
                                No deep security scan available for this version.
                            </div>
                        )}
                    </div>

                            <div>
                                <div className={`${styles.sectionHeader} ${marketplace.headingSm}`}>
                                    <FileText size={18} /> File Manifest
                                </div>
                                <div className={previewFile ? marketplace.manifestGridSplit : marketplace.manifestGrid}>
                                    <div className={marketplace.manifestList}>
                                        {detailData.files?.map((f: any, i: number) => (
                                            <div
                                                key={i}
                                                onClick={() => handlePreviewFile(f.path)}
                                                className={previewFile === f.path
                                                    ? marketplace.manifestRowActive
                                                    : (i % 2 === 0 ? marketplace.manifestRowAlt : marketplace.manifestRow)}
                                            >
                                                <div className={marketplace.manifestPathWrap}>
                                                    <Code size={14} style={{ opacity: 0.5 }} />
                                                    <code className={previewFile === f.path ? marketplace.manifestCodeActive : marketplace.manifestCode}>{f.path}</code>
                                                </div>
                                                <span className={marketplace.manifestSize}>{(f.size / 1024).toFixed(1)} KB</span>
                                            </div>
                                        ))}
                                    </div>

                                    {previewFile && (
                                        <div className={marketplace.previewPane}>
                                            <div className={marketplace.previewHead}>
                                                <span>Previewing: {previewFile}</span>
                                                <Button variant="ghost" size="sm" className={marketplace.previewClose} onClick={() => setPreviewFile(null)}>Close</Button>
                                            </div>
                                            <div className={marketplace.previewBody}>
                                                {loadingContent ? (
                                                    <div className={marketplace.centerNote}><SkeletonLoader count={5} /></div>
                                                ) : (
                                                    <pre className={marketplace.previewPre}>
                                                        {previewContent}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={marketplace.detailFooter}>
                                <a
                                    href={`https://clawhub.ai/sit-in/${detailSlug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={marketplace.clawhubLink}
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
                    <div className={marketplace.stackXl}>
                        <div className={marketplace.infoBox}>
                            <div className={marketplace.infoTitle}>
                                <ShieldCheck size={18} /> Provider Authentication
                            </div>
                            <div className={marketplace.infoBody}>
                                To use the FLock decentralised AI models, you must provide your <strong>FLock API Key</strong>.
                                This key will be stored securely in your agent's private Vault.
                            </div>
                        </div>

                        <div className={marketplace.fieldStack}>
                            <label className={marketplace.fieldLabel}>FLock API Key</label>
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
                                className={marketplace.externalRight}
                            >
                                Get a key from the FLock Dashboard →
                            </a>
                        </div>

                        <div className={marketplace.modalActions}>
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
                    <div className={marketplace.stackXl}>
                        <div className={marketplace.riskBox}>
                            <div className={marketplace.riskTitle}>
                                <ShieldAlert size={20} /> Execution Risks
                            </div>
                            <div className={marketplace.riskBody}>
                                You are about to install <strong>{installConfirmSlug}</strong>.
                                This skill was developed by a third party and will have permission to:
                            </div>
                            <ul className={marketplace.riskList}>
                                <li>Execute code within your agent's secure container</li>
                                <li>Access environment variables and configured API keys</li>
                                <li>Interact with your linked social channels (if permitted by code)</li>
                            </ul>
                            <div className={marketplace.riskFooter}>
                                Ensure you have reviewed the code manifest and the LLM Security Scan before proceeding.
                            </div>
                        </div>

                        <div className={marketplace.modalActions}>
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
                <div className={`${styles.provisioningBanner} ${marketplace.bannerSpaced}`}>
                    <Info size={14} />
                    <span>Activating or deactivating plugins requires an agent restart to re-map container volumes.</span>
                </div>
            )}

            {(activeTab === 'installed' || activeTab === 'plugins') && (
                <>
                    <h3 className={`${styles.agentName} ${marketplace.localHeading}`}>
                        {searchQuery ? 'Local Results' : `Installed ${activeTab === 'plugins' ? 'Plugins' : 'Skills'}`}
                    </h3>

                    <div className={marketplace.stack}>
                        {filteredLocal.map((item) => {
                            const isActive = activeTab !== 'plugins'
                                ? currentAgent?.activeSkills.includes(item.id)
                                : currentAgent?.activePlugins.includes(item.id);
                            return (
                                <Card key={item.id}>
                                    <div className={marketplace.resultRow}>
                                        <div className={marketplace.resultMain}>
                                            <div className={marketplace.iconTileNeutral}>
                                                {activeTab === 'installed' ? <Cpu size={20} /> : <Box size={20} />}
                                            </div>
                                            <div className={marketplace.resultText}>
                                                <div className={styles.agentName}>{item.name || item.id}</div>
                                                {item.description && (
                                                    <div className={`${styles.agentMetaItem} ${marketplace.localDesc}`}>
                                                        {item.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Toggle
                                            checked={isActive || false}
                                            disabled={!selectedAgent}
                                            ariaLabel={`Enable ${item.name || item.id}`}
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

export default function MarketplacePage() {
    return (
        <Suspense fallback={<div className={marketplace.emptyPadded}><SkeletonLoader variant="card" count={4} /></div>}>
            <MarketplaceContent />
        </Suspense>
    );
}
