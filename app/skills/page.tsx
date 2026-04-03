'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/landing/Header';
import styles from '@/components/landing/Landing.module.css';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Search, Download, Star, TrendingUp, Box } from 'lucide-react';
import { getTrendingSkills, searchClawHub } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

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

    const handleInstallClick = (slug: string) => {
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
                    
                    <div style={{ maxWidth: '600px', margin: '3rem auto 0', position: 'relative' }}>
                        <Input 
                            placeholder="Search skills, plugins, or creators..." 
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            icon={<Search size={18} />}
                        />
                    </div>
                </div>
            </section>

            <section className={styles.container} style={{ paddingBottom: '100px' }}>
                {searchQuery.length > 2 ? (
                    <div className={styles.resultsSection}>
                        <h2 className={styles.sectionTitle} style={{ textAlign: 'left', fontSize: '1.5rem' }}>Search Results</h2>
                        <div className={styles.pricingGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {searching ? (
                                <div>Searching ClawHub...</div>
                            ) : results.map((res) => (
                                <SkillCard key={res.slug} skill={res} onInstall={handleInstallClick} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={styles.trendingSection}>
                        <h2 className={styles.sectionTitle} style={{ textAlign: 'left', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <TrendingUp color="#ff4b4b" /> Trending Skills
                        </h2>
                        <div className={styles.pricingGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {loading ? (
                                <div>Loading trending...</div>
                            ) : trending.map((res) => (
                                <SkillCard key={res.slug} skill={res} onInstall={handleInstallClick} />
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}

function SkillCard({ skill, onInstall }: { skill: any, onInstall: (slug: string) => void }) {
    return (
        <Card className={styles.skillCard}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '48px', height: '48px', background: 'rgba(26,26,26,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box size={24} color="var(--text-secondary)" strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{skill.displayName || skill.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Star size={12} fill="#FFB800" color="#FFB800" /> {skill.stats?.stars || 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Download size={12} /> {skill.stats?.downloads?.toLocaleString() || 0}
                        </span>
                    </div>
                </div>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 1.5rem 0', flex: 1 }}>
                {skill.summary || skill.description}
            </p>
            <Button variant="secondary" fullWidth onClick={() => onInstall(skill.slug)}>Install Skill</Button>
        </Card>
    );
}
