'use client';

import Image from 'next/image';
import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { LayoutGrid, Puzzle, Settings, Shield, LogOut, Users, CreditCard } from 'lucide-react';
import styles from '@/components/dashboard/Dashboard.module.css';

const navItems = [
    { href: '/dashboard', label: 'Agents', icon: LayoutGrid },
    { href: '/dashboard/lobby', label: 'Lobby', icon: Users },
    { href: '/dashboard/skills', label: 'Skills', icon: Puzzle },
    { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user && !user.tenantId) {
            router.push('/onboarding');
        }
    }, [user, isLoading, router]);

    return (
        <div className={styles.dashboardLayout}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarBrand}>
                    <Link href="/">
                        <Image src="/black_logo.svg" alt="open loft Logo" width={100} height={32} priority />
                    </Link>
                </div>
                <nav className={styles.sidebarNav}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={isActive ? styles.sidebarLinkActive : styles.sidebarLink}
                            >
                                <Icon size={16} />
                                {item.label}
                            </Link>
                        );
                    })}
                    {user?.role === 'admin' && (
                        <Link
                            href="/admin"
                            className={pathname === '/admin' ? styles.sidebarLinkActive : styles.sidebarLink}
                        >
                            <Shield size={16} />
                            Admin
                        </Link>
                    )}
                </nav>
                <div className={styles.sidebarFooter}>
                    <div className={styles.sidebarUser}>{user?.email || 'user@loft.ai'}</div>
                    <button className={styles.sidebarLink} onClick={logout} style={{ paddingLeft: 0, marginTop: '0.5rem' }}>
                        <LogOut size={14} />
                        Log Out
                    </button>
                </div>
            </aside>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
