'use client';

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { Github } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { isAccountAreaEnabled, FRAMEWORK_REPO } from '@/lib/features';
import styles from './Landing.module.css';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { Application } from '@splinetool/runtime';

// Dynamically import Spline to avoid SSR issues
const Spline = dynamic(() => import('@splinetool/react-spline'), {
    ssr: false,
    loading: () => <SplineSkeleton />,
});

function SplineSkeleton() {
    return (
        <div className={styles.splineSkeleton}>
            <div className={styles.skeletonPulse} />
            <span className={styles.skeletonText}>Loading 3D Scene</span>
        </div>
    );
}

/* The 3D scene and its multi-megabyte runtime stay off phones: the compact
   hero renders a static postcard instead. useSyncExternalStore reads the
   matchMedia query on the very first client render — before any effect —
   so the dynamic import never starts on a phone (a state-then-effect hook
   would flash the desktop skeleton and fetch the runtime anyway). */
const compactQuery = '(max-width: 900px)';
function subscribeCompact(onChange: () => void) {
    const mq = window.matchMedia(compactQuery);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
}
function useCompactViewport() {
    return useSyncExternalStore(
        subscribeCompact,
        () => window.matchMedia(compactQuery).matches,
        () => false,
    );
}

export default function Hero() {
    const { isAuthenticated } = useAuth();
    /* Pre-launch: the docs CTA is the only honest action here. */
    const accountEnabled = isAccountAreaEnabled();
    const compact = useCompactViewport();
    const [splineLoaded, setSplineLoaded] = useState(false);
    /* The scene mounts only after hydration confirms a desktop viewport. A
       phone's brief desktop-shaped hydration frame must not even fetch the
       runtime chunk; the skeleton it shows for two frames is what the
       dynamic import already showed while loading. */
    const [splineMounted, setSplineMounted] = useState(false);
    useEffect(() => {
        if (compact) return;
        /* One frame later than "immediately", but phones never even fetch
           the runtime chunk: their first mounted frame is the postcard. */
        let alive = true;
        const id = requestAnimationFrame(() => {
            if (alive) setSplineMounted(true);
        });
        return () => {
            alive = false;
            cancelAnimationFrame(id);
        };
    }, [compact]);

    const handleSplineLoad = useCallback((splineApp: Application) => {
        const canvas = splineApp.canvas as HTMLCanvasElement;
        if (canvas) {
            canvas.style.background = 'transparent';
            canvas.style.backgroundColor = 'transparent';
        }
        if (canvas.parentElement) {
            canvas.parentElement.style.background = 'transparent';
        }
        setSplineLoaded(true);
    }, []);

    return (
        <section className={styles.heroSection}>

            <div className={styles.heroContent}>

                {/* Left Side: Headline + Description */}
                <motion.div
                    className={styles.heroLeft}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <h1 className={styles.heroHeadline}>
                        Memory is what makes an agent an agent
                    </h1>
                    <p className={styles.heroDescription}>
                        Most assistants forget the moment the transcript scrolls away. <span style={{ color: '#F47A4A' }}>NMAFC</span> is an open-source memory layer that keeps a dated, decay-aware, source-attributed record of everything it learns — and hands back a small, precise context hundreds of sessions later.
                    </p>
                    <div className={styles.heroActions}>
                        {accountEnabled ? (
                            isAuthenticated ? (
                                <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
                            ) : (
                                <>
                                    <Link href="/docs" className="btn-secondary">Read the docs</Link>
                                    <Link href="/auth/register" className="btn-primary">Get OpenLoft Memory</Link>
                                </>
                            )
                        ) : (
                            <>
                                <Link href="/docs" className="btn-primary">Read the docs</Link>
                                <Link href={FRAMEWORK_REPO} target="_blank" rel="noreferrer noopener" className="btn-secondary">
                                    <Github size={15} aria-hidden />
                                    Get the framework
                                </Link>
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Right Side: 3D Spline model on desktop; a static memory
                    postcard on phones — the properties the headline claims,
                    drawn, without the 3D runtime. */}
                <motion.div
                    className={styles.heroRight}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                >
                    {compact ? (
                        <div className={styles.heroPostcard} aria-label="What the memory guarantees">
                            <span className={styles.heroPostcardRow}>
                                <span style={{ background: 'var(--accent-forest)' }} />
                                Dated
                            </span>
                            <span className={styles.heroPostcardRow}>
                                <span style={{ background: 'var(--accent-coral)' }} />
                                Decay-aware
                            </span>
                            <span className={styles.heroPostcardRow}>
                                <span style={{ background: 'var(--accent-blue)' }} />
                                Source-attributed
                            </span>
                            <span className={styles.heroPostcardFacts}>
                                what recall reads back
                            </span>
                        </div>
                    ) : splineMounted ? (
                        <div className={styles.splineBox}>
                            {!splineLoaded && <SplineSkeleton />}
                            <div
                                className={styles.splineCanvas}
                                style={{ opacity: splineLoaded ? 1 : 0 }}
                            >
                                <Spline
                                    scene="https://prod.spline.design/AgBxmKW9HDN4p0op/scene.splinecode"
                                    onLoad={handleSplineLoad}
                                />
                            </div>
                        </div>
                    ) : null}
                </motion.div>

            </div>

        </section>
    );
}
