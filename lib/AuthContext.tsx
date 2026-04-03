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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<IUserContext | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Restore session from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('loft_token');
        const storedUser = localStorage.getItem('loft_user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
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
        if (res.user.tenantId) {
            router.push('/dashboard');
        } else {
            router.push('/onboarding');
        }
    }, [persistAuth, router]);

    const register = useCallback(async (data: IRegisterRequest) => {
        const res = await apiRegister(data);
        return { email: res.email };
    }, []);

    const verifyEmail = useCallback(async (email: string, code: string) => {
        const res = await apiVerifyEmail({ email, code });
        persistAuth(res.token, res.user);
        // Note: verifyEmail usually means new user, always onboarding? 
        // Better to check tenantId here too for safety.
        if (res.user.tenantId) {
            router.push('/dashboard');
        } else {
            router.push('/onboarding');
        }
    }, [persistAuth, router]);

    const resendOTP = useCallback(async (email: string) => {
        await apiResendOTP(email);
    }, []);

    const googleLogin = useCallback(async (data: IGoogleLoginRequest) => {
        const res = await apiGoogleLogin(data);
        console.log('[Auth] Google Login Response:', res.user);
        persistAuth(res.token, res.user);
        if (res.user.tenantId) {
            console.log('[Auth] Redirecting to Dashboard (tenantId found)');
            router.push('/dashboard');
        } else {
            console.log('[Auth] Redirecting to Onboarding (no tenantId)');
            router.push('/onboarding');
        }
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
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
