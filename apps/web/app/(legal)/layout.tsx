import { MarketingNav } from '../../components/marketing/Nav';
import { MarketingFooter } from '../../components/marketing/Footer';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="neon-editorial" style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh', fontFamily: '"Inter Tight", sans-serif' }}>
      <MarketingNav />

      {/* Content */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 28px 80px' }}>
        {children}
      </main>

      <MarketingFooter />
    </div>
  );
}
