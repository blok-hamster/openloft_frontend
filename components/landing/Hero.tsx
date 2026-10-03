'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
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

export default function Hero() {
    const { isAuthenticated } = useAuth();
    const [splineLoaded, setSplineLoaded] = useState(false);

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
                        {isAuthenticated ? (
                            <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
                        ) : (
                            <>
                                <Link href="/docs" className="btn-secondary">Read the docs</Link>
                                <Link href="/auth/register" className="btn-primary">Get OpenLoft Memory</Link>
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Right Side: 3D Spline Model */}
                <motion.div
                    className={styles.heroRight}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                >
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
                </motion.div>

            </div>

        </section>
    );
}
