'use client';

import Link from 'next/link';
import { Brain, LayoutGrid } from 'lucide-react';
import styles from './ProductSwitcher.module.css';

/**
 * Identity-level switch between the platform's two products: the agent
 * console (/dashboard) and the hosted memory service (/memory).
 *
 * Memory is the headline product — a user must never have to type a URL to
 * reach it. The switch sits OUTSIDE both shells' <nav> section lists on
 * purpose: a product's sections keep living in their own sidebar, and only
 * this control crosses between them, so neither product's nav "advertises"
 * the other's content — they just promote it.
 *
 * Rendered inside the shared sidebar brand/header area of both layouts in
 * exactly the same slot, one act of learning covers both consoles.
 */
export type ProductSwitcherId = 'agents' | 'memory';

export const products = [
    { id: 'agents' as const, href: '/dashboard', label: 'Agents', icon: LayoutGrid },
    { id: 'memory' as const, href: '/memory', label: 'Memory', icon: Brain },
];

export default function ProductSwitcher({
    active,
    onNavigate,
}: {
    /** Which product the user is inside right now; that side renders active. */
    active: ProductSwitcherId;
    /** Drawer navigation closes itself on click; pass the close callback. */
    onNavigate?: () => void;
}) {
    return (
        <div className={styles.wrap} role="group" aria-label="Switch service">
            {products.map(({ id, href, label, icon: Icon }) => {
                const isActive = id === active;
                return (
                    <Link
                        key={id}
                        href={href}
                        className={isActive ? styles.itemActive : styles.item}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={onNavigate}
                    >
                        <Icon size={14} />
                        {label}
                    </Link>
                );
            })}
        </div>
    );
}
