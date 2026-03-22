'use client';

import Link from 'next/link';
import styles from './Landing.module.css';

export default function Header() {
    return (
        <header className="glass-header">
            <div className={styles.navContainer}>
                {/* Logo */}
                <div className={styles.brand}>
                    <span>LOFT</span>
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
                    <Link href="/auth/login" className="btn-secondary">Sign In</Link>
                    <Link href="/auth/register" className="btn-primary">Deploy Agent</Link>
                </div>
            </div>
        </header>
    );
}
