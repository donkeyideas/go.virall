import { MarketingNav } from '../../components/marketing/Nav';
import { MarketingFooter } from '../../components/marketing/Footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="neon-editorial"
      style={{
        background: 'var(--paper)',
        color: 'var(--ink)',
        minHeight: '100vh',
        fontFamily: '"Inter Tight", sans-serif',
      }}
    >
      <MarketingNav />
      {children}
      <MarketingFooter showCTA={false} />
    </div>
  );
}
