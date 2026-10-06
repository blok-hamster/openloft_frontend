'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/landing/Header';
import styles from '@/components/landing/Landing.module.css';
import { isAccountAreaEnabled } from '@/lib/features';
import ps from './PublicSkills.module.css';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Search, Download, Star, TrendingUp, Box } from 'lucide-react';
import { getTrendingSkills, searchClawHub } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PublicSkillsPage() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [trending, setTrending] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        async function loadTrending() {
            setLoading(true);
            try {
                const data = await getTrendingSkills();
                setTrending(data);
            } catch (err) {
                console.error('Failed to load trending skills', err);
            } finally {
                setLoading(false);
            }
        }
        loadTrending();
    }, []);

    const handleSearch = async (val: string) => {
        setSearchQuery(val);
        if (val.length > 2) {
            setSearching(true);
            try {
                const data = await searchClawHub(val);
                setResults(data);
            } catch (err) {
                console.error('Search failed', err);
            } finally {
                setSearching(false);
            }
        } else {
            setResults([]);
        }
    };

    /* Browsing the public catalogue stays open pre-launch — only the
       install path, which lands in the gated dashboard, is withdrawn. */
    const accountEnabled = isAccountAreaEnabled();

    const handleInstallClick = (slug: string) => {
        if (!accountEnabled) {
            router.push('/docs');
            return;
        }
        if (!isAuthenticated) {
            router.push(`/auth/login?redirect=/dashboard/skills?install=${slug}`);
        } else {
            router.push(`/dashboard/skills?install=${slug}`);
        }
    };

    return (
        <main className={styles.landingPage}>
            <Header />
            
            <section className={styles.productHero}>
                <div className={styles.container}>
                    <h1 className={styles.heroTitle}>Extend Your Swarm</h1>
                    <p className={styles.heroSubtitle}>Discover thousands of community-built skills and plugins on ClawHub.</p>
                    
                    <div className={ps.searchWrap}>
                        <Input 
                            placeholder="Search skills, plugins, or creators..." 
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            icon={<Search size={18} />}
                        />
                    </div>
                </div>
            </section>

            <section className={`${styles.container} ${ps.bodySection}`}>
                {searchQuery.length > 2 ? (
                    <div className={ps.resultsSection}>
                        <h2 className={ps.sectionTitle}>Search Results</h2>
                        <div className={ps.grid}>
                            {searching ? (
                                <div className={ps.statusNote}>Searching ClawHub...</div>
                            ) : results.map((res) => (
                                <SkillCard key={res.slug} skill={res} onInstall={handleInstallClick} canInstall={accountEnabled} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={ps.trendingSection}>
                        <h2 className={ps.sectionTitleRow}>
                            <TrendingUp color="#ff4b4b" /> Trending Skills
                        </h2>
                        <div className={ps.grid}>
                            {loading ? (
                                <div className={ps.statusNote}>Loading trending...</div>
                            ) : trending.map((res) => (
                                <SkillCard key={res.slug} skill={res} onInstall={handleInstallClick} canInstall={accountEnabled} />
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}

function SkillCard({
    skill,
    onInstall,
    canInstall,
}: {
    skill: any;
    onInstall: (slug: string) => void;
    canInstall: boolean;
}) {
    return (
        <Card className={ps.skillCard}>
            <div className={ps.cardHead}>
                <div className={ps.cardIcon}>
                    <Box size={24} color="var(--text-secondary)" strokeWidth={1.5} />
                </div>
                <div className={ps.cardHeadText}>
                    <h3 className={ps.cardName}>{skill.displayName || skill.name}</h3>
                    <div className={ps.cardStats}>
                        <span className={ps.cardStat}>
                            <Star size={12} fill="#FFB800" color="#FFB800" /> {skill.stats?.stars || 0}
                        </span>
                        <span className={ps.cardStat}>
                            <Download size={12} /> {skill.stats?.downloads?.toLocaleString() || 0}
                        </span>
                    </div>
                </div>
            </div>
            <p className={ps.cardBlurb}>
                {skill.summary || skill.description}
            </p>
            {canInstall ? (
                <Button type="button" variant="secondary" fullWidth onClick={() => onInstall(skill.slug)}>
                    Install Skill
                </Button>
            ) : (
                <Link href="/docs" className={`${ps.docsLink} ${ps.fullWidth}`}>
                    Read the docs
                </Link>
            )}
        </Card>
    );
}
