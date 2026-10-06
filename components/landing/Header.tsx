'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isAccountAreaEnabled } from '@/lib/features';
import styles from './Landing.module.css';

const links = [
    { href: '/products', label: 'Products' },
    { href: '/resources', label: 'Resources' },
    { href: '/docs', label: 'Docs' },
];

export default function Header() {
    const { isAuthenticated } = useAuth();
    const pathname = usePathname();
    /* Hide the account CTAs entirely rather than linking into the
       pre-launch notice. Both the desktop bar and the mobile drawer read
       this, so the two can never disagree. */
    const accountEnabled = isAccountAreaEnabled();
    const [open, setOpen] = useState(false);
    const toggleRef = useRef<HTMLButtonElement>(null);

    /* Close the drawer from the link handlers rather than watching
     * pathname in an effect — same behaviour, no cascading render. */
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
                toggleRef.current?.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open]);

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

    return (
        <header className="glass-header">
            <div className={styles.navContainer}>
                {/* Logo */}
                <div className={styles.brand}>
                    <Link href="/" onClick={() => setOpen(false)}>
                        <Image src="/black_logo.svg" alt="OpenLoft" width={120} height={40} priority />
                    </Link>
                </div>

                {/* Desktop links */}
                <nav className={styles.navLinks} aria-label="Main">
                    {links.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className={`${styles.navLink} ${isActive(l.href) ? styles.navLinkActive : ''}`}
                            aria-current={isActive(l.href) ? 'page' : undefined}
                        >
                            {l.label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop actions */}
                <div className={`${styles.navActions} ${accountEnabled ? '' : styles.navActionsHidden}`}>
                    {accountEnabled && isAuthenticated ? (
                        <Link href="/dashboard" className="btn-primary">Dashboard</Link>
                    ) : (
                        <>
                            <Link href="/auth/login" className="btn-secondary">Sign In</Link>
                            <Link href="/auth/register" className="btn-primary">Get Started</Link>
                        </>
                    )}
                </div>

                <button
                    ref={toggleRef}
                    type="button"
                    className={styles.navToggle}
                    onClick={() => setOpen((v) => !v)}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    aria-expanded={open}
                    aria-controls="mobile-nav"
                >
                    {open ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {open && (
                <nav className={styles.mobileNav} id="mobile-nav" aria-label="Main">
                    {links.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className={`${styles.mobileNavLink} ${isActive(l.href) ? styles.navLinkActive : ''}`}
                            onClick={() => setOpen(false)}
                        >
                            {l.label}
                        </Link>
                    ))}
                    {accountEnabled && (
                    <div className={styles.mobileNavActions}>
                        {isAuthenticated ? (
                            <Link href="/dashboard" className="btn-primary" onClick={() => setOpen(false)}>Dashboard</Link>
                        ) : (
                            <>
                                <Link href="/auth/login" className="btn-secondary" onClick={() => setOpen(false)}>Sign In</Link>
                                <Link href="/auth/register" className="btn-primary" onClick={() => setOpen(false)}>Get Started</Link>
                            </>
                        )}
                    </div>
                    )}
                </nav>
            )}
        </header>
    );
}
