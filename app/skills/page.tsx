'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/landing/Header';
import styles from '@/components/landing/Landing.module.css';
import { isAccountAreaEnabled } from '@/lib/features';
import ps from './PublicSkills.module.css';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Search, Download, Star, TrendingUp, Box } from 'lucide-react';
import { getTrendingSkills, searchClawHub, ISkillResult } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PublicSkillsPage() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const [trending, setTrending] = useState<ISkillResult[]>([]);
    const [results, setResults] = useState<ISkillResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    /* The catalogue's failures were console-only; the panels just sat
       empty, indistinguishable from a quiet registry. */
    const [trendingError, setTrendingError] = useState<string | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    useEffect(() => {
        async function loadTrending() {
            setLoading(true);
            try {
                const data = await getTrendingSkills();
                setTrending(data);
            } catch {
                setTrendingError('Trending skills are unavailable right now.');
            } finally {
                setLoading(false);
            }
        }
        loadTrending();
    }, []);

    /* Same contract as the dashboard marketplace: debounced, and a slow old
       response cannot overwrite the results of a newer query. */
    const searchTokenRef = useRef(0);
    const [searchQuery, setSearchQuery] = useState('');
    useEffect(() => {
        const query = searchQuery.trim();
        if (query.length <= 2) {
            setResults([]);
            setSearching(false);
            setSearchError(null);
            return;
        }
        const token = ++searchTokenRef.current;
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const data = await searchClawHub(query);
                if (searchTokenRef.current !== token) return;
                setResults(data);
            } catch {
                if (searchTokenRef.current !== token) return;
                setSearchError('Search failed — try again in a moment.');
            } finally {
                if (searchTokenRef.current === token) setSearching(false);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    /* Browsing the public catalogue stays open pre-launch — only the
       install path, which lands in the gated dashboard, is withdrawn. */
    const accountEnabled = isAccountAreaEnabled();

    const handleInstallClick = (slug: string) => {
        if (!accountEnabled) {
            router.push('/docs');
            return;
        }
        if (!isAuthenticated) {
            /* The redirect target has its own query — encode it so the
               login page receives one parameter, not a nested `?`. */
            router.push(
              `/auth/login?redirect=${encodeURIComponent(`/dashboard/skills?install=${slug}`)}`,
            );
        } else {
            router.push(`/dashboard/skills?install=${slug}`);
        }
    };

    return (
        <main className={styles.landingPage}>
            <Header />
            
            <section className={styles.productHero}>
                <div className={styles.container}>
                    <h1 className={styles.heroTitle}>Extend what your agents can do</h1>
                    <p className={styles.heroSubtitle}>Discover thousands of community-built skills and plugins on ClawHub.</p>
                    
                    <div className={ps.searchWrap}>
                        <Input
                            aria-label="Search skills, plugins, or creators"
                            placeholder="Search skills, plugins, or creators..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                            ) : searchError ? (
                                <div className={ps.statusNote}>{searchError}</div>
                            ) : results.length === 0 ? (
                                <div className={ps.statusNote}>
                                    No skills match “{searchQuery.trim()}”. Try a broader term.
                                </div>
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
                            ) : trendingError ? (
                                <div className={ps.statusNote}>{trendingError}</div>
                            ) : trending.length === 0 ? (
                                <div className={ps.statusNote}>No trending skills right now.</div>
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
    skill: ISkillResult;
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
