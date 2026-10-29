'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useDrawerFocus } from '@/lib/useDrawerFocus';
import { Brain, CreditCard, KeyRound, LogOut, Menu, ScrollText, X, Plus, Share2, FlaskConical } from 'lucide-react';
import styles from '@/components/dashboard/Dashboard.module.css';
import shell from './MemoryShell.module.css';
import FeatureGate from '@/components/FeatureGate';
import ProductSwitcher from '@/components/dashboard/ProductSwitcher';
import { isAccountAreaEnabled } from '@/lib/features';

/**
 * The hosted memory service is a product of its own, not a section of the
 * agent console, so it gets a shell of its own: /memory is the service's
 * dashboard and /dashboard stays the agent's. The section lists stay
 * service-specific — the ProductSwitcher above them is the bridge between
 * the products — and the one deliberate exception is Billing below: the
 * tenant's subscription and credit balance is a single shared surface (the
 * backend debits the same Tenant.billing for agent runs and memory usage),
 * so both shells link the same page rather than shipping two billing UIs.
 * The auth and drawer mechanics are deliberately identical so a user with
 * both products does not have to relearn how the sidebar behaves.
 *
 * The sections are the service's own surface, kept to the five the user
 * actually navigates between: the console home, one observability page
 * (Records folds Events and Decay into tabs beside the fact list), the
 * entity graph as it is drawn, the chat endpoints behind Playground, and
 * Keys/Connections for wiring clients.
 */
export const memoryNavItems = [
    { href: '/memory', label: 'Console', icon: Brain },
    { href: '/memory/records', label: 'Records', icon: ScrollText },
    { href: '/memory/graph', label: 'Graph', icon: Share2 },
    { href: '/memory/playground', label: 'Playground', icon: FlaskConical },
    { href: '/memory/connections', label: 'Connections', icon: KeyRound },
    /* Shared with the agent shell on purpose — see the comment above. */
    { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
];

/* Exact match for the section root, prefix match for nested routes, so
 *  /memory/records highlights Records — and /memory highlights Console on
 *  its own page only: two simultaneously current links is a lying
 *  navigation landmark, not a highlight style. */
function isRouteActive(pathname: string, href: string) {
    if (href === '/memory') return pathname === href;
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
            // The destination rides along: ?redirect= means a sign-in puts
            // the reader back where they were, not at /dashboard. Read off
            // window.location rather than the useSearchParams hook — a
            // layout can statically render, and the hook then demands a
            // Suspense boundary this shell has no need to carry.
            const here = `${window.location.pathname}${window.location.search}`;
            router.replace(`/auth/login?redirect=${encodeURIComponent(here)}`);
            return;
        }
        if (!isLoading && user && !user.tenantId) {
            router.replace('/onboarding');
        }
    }, [user, isLoading, router]);

    /* Escape closes, and focus returns to the trigger. Tab stays inside:
       the drawer promises aria-modal, and a Tab that leaks through the
       scrim is a modal that lied (shared with the agent shell). */
    useDrawerFocus(navOpen, drawerRef, menuButtonRef, () => {
        setNavOpen(false);
        menuButtonRef.current?.focus();
    });

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
            <ProductSwitcher active="memory" onNavigate={() => setNavOpen(false)} />
            <nav className={styles.sidebarNav} id="memory-nav" aria-label="Memory dashboard">
                {memoryNavItems.map((item) => {                    const isActive = isRouteActive(pathname, item.href);
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
            {/* Email + logout live on the mobile bottom dock, so they're
               omitted from the drawer while it's open. Desktop keeps them
               because navOpen is never true there. */}
            {!navOpen && (
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
            )}
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
                /* Hidden while the drawer is open so it can't sit on top of
                   the drawer content / block the brand. Stays in the DOM so
                   the focus-return ref stays valid. */
                style={navOpen ? { display: 'none' } : undefined}
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
