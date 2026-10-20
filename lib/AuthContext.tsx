'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
    login as apiLogin,
    register as apiRegister,
    verifyEmail as apiVerifyEmail,
    resendOTP as apiResendOTP,
    googleLogin as apiGoogleLogin,
    logout as apiLogout,
    ILoginRequest,
    IRegisterRequest,
    IGoogleLoginRequest,
    IUserContext,
} from './api';
import axios from 'axios';

interface AuthContextType {
    user: IUserContext | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: ILoginRequest) => Promise<void>;
    register: (data: IRegisterRequest) => Promise<{ email: string }>;
    verifyEmail: (email: string, code: string) => Promise<void>;
    resendOTP: (email: string) => Promise<void>;
    googleLogin: (data: IGoogleLoginRequest) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<IUserContext>) => void;
    /**
     * Replace the stored session outright.
     *
     * `updateUser` only patches local state, so it cannot attach a field the
     * token does not carry. Creating a tenant mints a new tenantId that the
     * existing JWT predates — patching the user alone leaves the old token in
     * place and every tenant-scoped request fails. Anything that changes what
     * the token should contain must go through here.
     */
    persistAuth: (token: string, user: IUserContext) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

/**
 * Where a signed-in user asked to go. Protected shells (agents, memory,
 * team, billing) send `/auth/login?redirect=<path>` when a session is
 * missing; honoring it means the reader lands where they started instead
 * of back at `/dashboard`. Same-app paths only — `//host` or a scheme
 * would make this an open redirect.
 */
const postLoginDestination = (user: IUserContext): string => {
    const fallback = user.tenantId ? '/dashboard' : '/onboarding';
    if (typeof window === 'undefined') return fallback;
    const target = new URLSearchParams(window.location.search).get('redirect');
    if (target && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')) {
        return target;
    }
    return fallback;
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<IUserContext | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Restore session from localStorage on mount. The stored user is JSON:
    // a hand-edited or half-written value must shed the session, not crash
    // every page that mounts AuthProvider.
    useEffect(() => {
        const storedToken = localStorage.getItem('loft_token');
        const storedUser = localStorage.getItem('loft_user');
        if (storedToken && storedUser) {
            let restored: IUserContext | null = null;
            try {
                restored = JSON.parse(storedUser) as IUserContext;
            } catch {
                restored = null;
            }
            if (restored) {
                setToken(storedToken);
                setUser(restored);
            } else {
                localStorage.removeItem('loft_user');
                localStorage.removeItem('loft_token');
            }
        }
        setIsLoading(false);
    }, []);

    // Sync axios Authorization header whenever token changes
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    const persistAuth = useCallback((authToken: string, authUser: IUserContext) => {
        setToken(authToken);
        setUser(authUser);
        localStorage.setItem('loft_token', authToken);
        localStorage.setItem('loft_user', JSON.stringify(authUser));
    }, []);

    const clearAuth = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('loft_token');
        localStorage.removeItem('loft_user');
    }, []);

    const login = useCallback(async (data: ILoginRequest) => {
        const res = await apiLogin(data);
        persistAuth(res.token, res.user);
        router.push(postLoginDestination(res.user));
    }, [persistAuth, router]);

    const register = useCallback(async (data: IRegisterRequest) => {
        const res = await apiRegister(data);
        return { email: res.email };
    }, []);

    const verifyEmail = useCallback(async (email: string, code: string) => {
        const res = await apiVerifyEmail({ email, code });
        persistAuth(res.token, res.user);
        router.push(postLoginDestination(res.user));
    }, [persistAuth, router]);

    const resendOTP = useCallback(async (email: string) => {
        await apiResendOTP(email);
    }, []);

    const googleLogin = useCallback(async (data: IGoogleLoginRequest) => {
        const res = await apiGoogleLogin(data);
        persistAuth(res.token, res.user);
        router.push(postLoginDestination(res.user));
    }, [persistAuth, router]);

    const updateUser = useCallback((updates: Partial<IUserContext>) => {
        if (!user) return;
        const newUser = { ...user, ...updates };
        setUser(newUser);
        localStorage.setItem('loft_user', JSON.stringify(newUser));
    }, [user]);

    const logout = useCallback(async () => {
        try {
            await apiLogout();
        } catch {
            // logout even if API fails
        }
        clearAuth();
        router.push('/auth/login');
    }, [clearAuth, router]);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!token,
                isLoading,
                login,
                register,
                verifyEmail,
                resendOTP,
                googleLogin,
                logout,
                updateUser,
                persistAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
