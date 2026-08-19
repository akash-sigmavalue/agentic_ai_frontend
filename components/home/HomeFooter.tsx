import Link from 'next/link';

type HomeFooterProps = {
  isDark: boolean;
};

const supportLinks = [
  { label: 'Contact us', href: '/contact' },
  { label: 'Terms and Conditions', href: '/termsandconditions' },
  { label: 'Privacy policy', href: '/privacypolicy' },
  { label: 'About us', href: '/about' },
];

export default function HomeFooter({ isDark }: HomeFooterProps) {
  const mutedColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <footer className="hp-footer">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: mutedColor, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          System Operational
        </span>
      </div>
      <nav aria-label="Support" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
          Support
        </span>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 16px' }}>
          {supportLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              style={{ fontSize: 11, fontWeight: 600, color: mutedColor, textDecoration: 'none' }}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
        © 2026 Sigmavalue AI Corp
      </span>
    </footer>
  );
}
