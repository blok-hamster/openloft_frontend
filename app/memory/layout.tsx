'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Brain, KeyRound, LogOut, Menu, ScrollText, X, Plus, Activity, Share2, TrendingDown, FlaskConical } from 'lucide-react';
import styles from '@/components/dashboard/Dashboard.module.css';
import shell from './MemoryShell.module.css';
import FeatureGate from '@/components/FeatureGate';
import { isAccountAreaEnabled } from '@/lib/features';

/**
 * The hosted memory service is a product of its own, not a section of the
 * agent console, so it gets a shell of its own: /memory is the service's
 * dashboard and /dashboard stays the agent's. The two share nothing here —
 * no nav entries cross over, and the auth and drawer mechanics are the only
 * parts that are deliberately identical, because a user with both products
 * should not have to relearn how the sidebar behaves.
 *
 * The sections are the service's own surface: the chat endpoints are behind
 * Playground, and the rest is the read-only observability over records,
 * events, the entity graph and decay projections.
 */
export const memoryNavItems = [
    { href: '/memory', label: 'Console', icon: Brain },
    { href: '/memory/records', label: 'Records', icon: ScrollText },
    { href: '/memory/events', label: 'Events', icon: Activity },
    { href: '/memory/graph', label: 'Graph', icon: Share2 },
    { href: '/memory/decay', label: 'Decay', icon: TrendingDown },
    { href: '/memory/playground', label: 'Playground', icon: FlaskConical },
    { href: '/memory/connections', label: 'Connections', icon: KeyRound },
];

/** Exact match for the root, prefix match for nested routes, so
 *  /memory/connections still highlights Connections. */
function isRouteActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MemoryLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();

    const [navOpen, setNavOpen] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const drawerRef = useRef<HTMLElement>(null);

    /* While the account area is gated there is nowhere to send anyone:
       /auth/login and /onboarding are gated too, so redirecting would
       change the URL and still land on the same notice. Skip it and let
       FeatureGate render instead. */
    useEffect(() => {
        if (!isAccountAreaEnabled()) return;
        if (!isLoading && !user) {
            router.replace('/auth/login');
            return;
        }
        if (!isLoading && user && !user.tenantId) {
            router.replace('/onboarding');
        }
    }, [user, isLoading, router]);

    /* Escape closes, and focus returns to the trigger. */
    useEffect(() => {
        if (!navOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setNavOpen(false);
                menuButtonRef.current?.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [navOpen]);

    /* Move focus into the drawer when it opens so keyboard users land
     * on the nav rather than staying behind the scrim. */
    useEffect(() => {
        if (navOpen) {
            drawerRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
        }
    }, [navOpen]);

    /* Lock background scroll while the drawer is open. */
    useEffect(() => {
        if (!navOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [navOpen]);

    const navContent = (
        <>
            <div className={styles.sidebarBrand}>
                <div className={shell.brandRow}>
                    <Link href="/" onClick={() => setNavOpen(false)}>
                        <Image src="/black_logo.svg" alt="OpenLoft" width={100} height={32} priority />
                    </Link>
                    <span className={shell.serviceLabel}>Memory</span>
                </div>
            </div>
            <nav className={styles.sidebarNav} id="memory-nav" aria-label="Memory dashboard">
                {memoryNavItems.map((item) => {
                    const isActive = isRouteActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={isActive ? styles.sidebarLinkActive : styles.sidebarLink}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => setNavOpen(false)}
                        >
                            <Icon size={16} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
            <div className={styles.sidebarFooter}>
                <div className={styles.sidebarUser}>{user?.email}</div>
                <button
                    type="button"
                    className={styles.logoutButton}
                    onClick={logout}
                >
                    <LogOut size={14} />
                    Log Out
                </button>
            </div>
        </>
    );

    return (
        <FeatureGate>
        <div className={styles.dashboardLayout}>
            {/* Mobile menu trigger. Lives in the DOM at all widths but is
                only displayed under 900px by CSS. */}
            <button
                ref={menuButtonRef}
                type="button"
                className={styles.mobileMenuButton}
                onClick={() => setNavOpen(true)}
                aria-label="Open navigation"
                aria-expanded={navOpen}
                aria-controls="memory-nav"
            >
                <Menu size={20} />
            </button>

            {/* Scrim sits behind the drawer. Not focusable — Escape handles close. */}
            {navOpen && (
                <div
                    className={styles.sidebarScrim}
                    onClick={() => setNavOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                ref={drawerRef}
                className={navOpen ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar}
                role={navOpen ? 'dialog' : undefined}
                aria-modal={navOpen ? 'true' : undefined}
                aria-label={navOpen ? 'Navigation' : undefined}
            >
                <button
                    type="button"
                    className={styles.drawerClose}
                    onClick={() => { setNavOpen(false); menuButtonRef.current?.focus(); }}
                    aria-label="Close navigation"
                >
                    <X size={20} />
                </button>
                {navContent}
            </aside>

            <main className={styles.mainContent}>
                {children}
            </main>

            {/* Thumb-reachable primary action, shown only under 900px. On the
                agent dashboard this is "New Agent"; here it is the action
                this service is actually for — connecting a client. */}
            <div className={styles.bottomBar}>
                <Link href="/memory/connections" className={`btn-primary ${styles.bottomBarButton}`}>
                    <Plus size={14} /> New connection
                </Link>
                <button type="button" onClick={logout} className={styles.bottomBarButton}>
                    <LogOut size={14} /> Log Out
                </button>
            </div>
        </div>
        </FeatureGate>
    );
}
