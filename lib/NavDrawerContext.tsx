'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface NavDrawerContextType {
    navOpen: boolean;
    openDrawer: () => void;
    closeDrawer: () => void;
    toggleDrawer: () => void;
}

const NavDrawerContext = createContext<NavDrawerContextType | undefined>(undefined);

export function useNavDrawer() {
    const ctx = useContext(NavDrawerContext);
    if (!ctx) throw new Error('useNavDrawer must be used within NavDrawerProvider');
    return ctx;
}

/* Shared drawer state that lives above both the dashboard and memory shells.
   Navigating between /dashboard and /memory unmounts one layout and mounts
   the other, so local state in either shell would reset to closed on every
   product switch. Keeping it here means the drawer stays open (and shows the
   newly mounted shell's nav) until the user taps the scrim or the close
   button. */
export function NavDrawerProvider({ children }: { children: ReactNode }) {
    const [navOpen, setNavOpen] = useState(false);

    const openDrawer = useCallback(() => setNavOpen(true), []);
    const closeDrawer = useCallback(() => setNavOpen(false), []);
    const toggleDrawer = useCallback(() => setNavOpen((prev) => !prev), []);

    return (
        <NavDrawerContext.Provider value={{ navOpen, openDrawer, closeDrawer, toggleDrawer }}>
            {children}
        </NavDrawerContext.Provider>
    );
}
