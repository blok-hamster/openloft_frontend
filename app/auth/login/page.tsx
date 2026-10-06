'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import styles from '@/components/auth/Auth.module.css';
import FeatureGate from '@/components/FeatureGate';
import { isAccountAreaEnabled } from '@/lib/features';

function LoginPageContent() {
    const { login, verifyEmail, resendOTP, googleLogin } = useAuth();
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
            await login({ email, password });
        } catch (err: any) {
            const message = err.response?.data?.error || err.message || 'Login failed';
            if (message.includes('not verified')) {
                setIsVerifying(true);
            }
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
            const message = err instanceof Error ? err.message : 'Google login failed';
            setError(message);
        }
    };

    /* Resend was fire-and-forget: a failed request produced an unhandled
       rejection and zero feedback, and double-tapping hammered the endpoint. */
    const [resending, setResending] = useState(false);

    const handleResend = async () => {
        if (resending) return;
        setResending(true);
        try {
            await resendOTP(email);
            setError('A new code is on its way.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send a new code.');
        } finally {
            setResending(false);
        }
    };

    /* The verify view was a dead end — no way back to the sign-in form. */
    const handleBackToForm = () => {
        setIsVerifying(false);
        setVerificationCode('');
        setError('');
    };

    if (isVerifying) {
        return (
            <div className={styles.authPage}>
                <div className={styles.authCard}>
                    <div className={styles.authBrand}>
                        <Link href="/">
                            <Image src="/black_logo.svg" alt="OpenLoft" width={100} height={32} />
                        </Link>
                    </div>
                    <div className={styles.authTitle}>Verify your email</div>
                    <p className={styles.authSubtitle}>
                        Your email isn't verified yet. We've sent a code to <strong>{email}</strong>
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
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            className={styles.otpInput}
                        />

                        {error && <div className={styles.authError}>{error}</div>}

                        <div className={styles.authSubmit}>
                            <Button type="button" variant="primary" size="lg" loading={loading} className={styles.authSubmitBlock}>
                                Verify Code
                            </Button>
                        </div>

                        <div className={`${styles.authFooter} ${styles.resendRow}`}>
                            Didn't receive a code?{' '}
                            <button
                                type="button"
                                className={styles.resendButton}
                                onClick={handleResend}
                                disabled={resending}
                            >
                                Resend
                            </button>
                        </div>

                        <button type="button" className={styles.backToForm} onClick={handleBackToForm}>
                            Use a different account
                        </button>
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
                            <Image src="/black_logo.svg" alt="OpenLoft" width={100} height={32} />
                        </Link>
                    </div>
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
                        <Button type="button" variant="primary" size="lg" loading={loading} className={styles.authSubmitBlock}>
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

/** Gated at the page boundary so every branch — sign-in form, OTP
 *  view, and any future one — is covered by a single check. */
export default function LoginPage() {
    return (
        <FeatureGate>
            <LoginPageContent />
        </FeatureGate>
    );
}
