'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import styles from '@/components/auth/Auth.module.css';

export default function LoginPage() {
    const { login, googleLogin } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login({ email, password });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Login failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async (credential: string) => {
        setError('');
        try {
            await googleLogin({ credential });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Google login failed';
            setError(message);
        }
    };

    return (
        <div className={styles.authPage}>
            <div className={styles.authCard}>
                <div className={styles.authBrand}>LOFT</div>
                <div className={styles.authTitle}>Sign in to your account</div>

                <form className={styles.authForm} onSubmit={handleSubmit}>
                    <Input
                        label="Email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && <div className={styles.authError}>{error}</div>}

                    <div className={styles.authSubmit}>
                        <Button variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
                            Sign In
                        </Button>
                    </div>

                    <div className={styles.authDivider}>
                        <div className={styles.authDividerLine} />
                        <span className={styles.authDividerText}>Or</span>
                        <div className={styles.authDividerLine} />
                    </div>

                    <GoogleAuthButton onSuccess={handleGoogleAuth} label="Sign in with Google" />
                </form>

                <div className={styles.authFooter}>
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/register">Register</Link>
                </div>
            </div>
        </div>
    );
}
