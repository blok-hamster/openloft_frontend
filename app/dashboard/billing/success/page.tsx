'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import styles from '@/components/dashboard/Dashboard.module.css';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CheckCircle } from 'lucide-react';

function SuccessContent() {
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        if (sessionId) {
            toast('Payment successful! Your account is being updated.', 'success');
        }
    }, [sessionId, toast]);

    return (
        <div className={styles.billingContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <Card style={{ maxWidth: '400px', textAlign: 'center', padding: '3rem' }}>
                <div style={{ color: '#22c55e', marginBottom: '1.5rem' }}>
                    <CheckCircle size={64} />
                </div>
                <h1 className={styles.headerTitle} style={{ marginBottom: '1rem' }}>Payment Successful!</h1>
                <p className={styles.headerSubtitle} style={{ marginBottom: '2rem' }}>
                    Thank you for your purchase. Your subscription or credits have been updated.
                </p>
                <Button variant="primary" fullWidth onClick={() => router.push('/dashboard/billing')}>
                    Return to Billing
                </Button>
            </Card>
        </div>
    );
}

export default function BillingSuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
