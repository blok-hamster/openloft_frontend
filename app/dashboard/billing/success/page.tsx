'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import styles from '@/components/dashboard/Dashboard.module.css';
import r from '../BillingResult.module.css';
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
        <div className={`${styles.billingContainer} ${r.resultCenter}`}>
            <Card className={r.resultCard}>
                <div className={r.resultIconSuccess}>
                    <CheckCircle size={64} aria-hidden="true" />
                </div>
                <h1 className={`${styles.headerTitle} ${r.resultTitle}`}>Payment Successful!</h1>
                <p className={`${styles.headerSubtitle} ${r.resultBody}`}>
                    Thank you for your purchase. Your subscription or credits have been updated.
                </p>
                <Button type="button" variant="primary" fullWidth onClick={() => router.push('/dashboard/billing')}>
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
