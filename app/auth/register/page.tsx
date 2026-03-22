'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import styles from '@/components/auth/Auth.module.css';

export default function RegisterPage() {
    const { register, googleLogin } = useAuth();
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register({ email, password, companyName });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Registration failed';
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
            const message = err instanceof Error ? err.message : 'Google sign-up failed';
            setError(message);
        }
    };

    return (
        <div className={styles.authPage}>
            <div className={styles.authCard}>
                <div className={styles.authBrand}>LOFT</div>
                <div className={styles.authTitle}>Create your account</div>

                <form className={styles.authForm} onSubmit={handleSubmit}>
                    <Input
                        label="Company Name"
                        type="text"
                        placeholder="Acme Inc."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                    />
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
                        minLength={8}
                    />

                    {error && <div className={styles.authError}>{error}</div>}

                    <div className={styles.authSubmit}>
                        <Button variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
                            Create Account
                        </Button>
                    </div>

                    <div className={styles.authDivider}>
                        <div className={styles.authDividerLine} />
                        <span className={styles.authDividerText}>Or</span>
                        <div className={styles.authDividerLine} />
                    </div>

                    <GoogleAuthButton onSuccess={handleGoogleAuth} label="Sign up with Google" />
                </form>

                <div className={styles.authFooter}>
                    Already have an account?{' '}
                    <Link href="/auth/login">Sign In</Link>
                </div>
            </div>
        </div>
    );
}
