'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import styles from './Landing.module.css';

export default function Header() {
    const { isAuthenticated } = useAuth();
    return (
        <header className="glass-header">
            <div className={styles.navContainer}>
                {/* Logo */}
                <div className={styles.brand}>
                    <Link href="/">
                        <Image src="/black_logo.svg" alt="LOFT Logo" width={120} height={40} priority />
                    </Link>
                </div>

                {/* Links */}
                <nav className={styles.navLinks}>
                    <Link href="#" className={styles.navLink}>Products</Link>
                    <Link href="#" className={styles.navLink}>Resources</Link>
                    <Link href="#" className={styles.navLink}>Skills</Link>
                    <Link href="#" className={styles.navLink}>Pricing</Link>
                    <Link href="#" className={styles.navLink}>Docs</Link>
                </nav>

                {/* Actions */}
                <div className={styles.navActions}>
                    {isAuthenticated ? (
                        <Link href="/dashboard" className="btn-primary">Dashboard</Link>
                    ) : (
                        <>
                            <Link href="/auth/login" className="btn-secondary">Sign In</Link>
                            <Link href="/auth/register" className="btn-primary">Deploy Agent</Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
