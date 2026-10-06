import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import ProductSections from '@/components/landing/ProductSections';
import styles from '@/components/landing/Landing.module.css';

export default function LandingPage() {
    return (
        <main className={styles.landingPage}>
            <Header />
            <Hero />
            {/* Three products the visitor navigates between:
                the framework, agents we host, and memory we host. */}
            <ProductSections />
        </main>
    );
}
