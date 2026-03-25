'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import styles from '@/components/auth/Auth.module.css';

export default function RegisterPage() {
    const { register, verifyEmail, resendOTP, googleLogin } = useAuth();
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await register({ email, password, companyName });
            setEmail(res.email);
            setIsVerifying(true);
        } catch (err: any) {
            const message = err.response?.data?.error || err.message || 'Registration failed';
            setEmail(email); // Ensure email is set even if something went wrong
            setIsVerifying(true);
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await verifyEmail(email, verificationCode);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Verification failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async (token: string) => {
        setError('');
        try {
            await googleLogin({ access_token: token });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Google sign-up failed';
            setError(message);
        }
    };

    if (isVerifying) {
        return (
            <div className={styles.authPage}>
                <div className={styles.authCard}>
                    <div className={styles.authBrand}>
                        <Link href="/">
                            <Image src="/black_logo.svg" alt="LOFT Logo" width={100} height={32} />
                        </Link>
                    </div>
                    <div className={styles.authTitle}>Verify your email</div>
                    <p className={styles.authSubtitle} style={{ marginBottom: '2rem', textAlign: 'center', opacity: 0.7 }}>
                        We've sent a 6-digit code to <strong>{email}</strong>
                    </p>

                    <form className={styles.authForm} onSubmit={handleVerify}>
                        <Input
                            label="Verification Code"
                            type="text"
                            placeholder="123456"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            required
                            maxLength={6}
                            style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem' }}
                        />

                        {error && <div className={styles.authError}>{error}</div>}

                        <div className={styles.authSubmit}>
                            <Button variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
                                Verify Code
                            </Button>
                        </div>
                        
                        <div className={styles.authFooter} style={{ marginTop: '1.5rem' }}>
                            Didn't receive a code?{' '}
                            <button 
                                type="button" 
                                onClick={() => resendOTP(email)} 
                                style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                            >
                                Resend
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.authPage}>
            <div className={styles.authCard}>
                    <div className={styles.authBrand}>
                        <Link href="/">
                            <Image src="/black_logo.svg" alt="LOFT Logo" width={100} height={32} />
                        </Link>
                    </div>
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
