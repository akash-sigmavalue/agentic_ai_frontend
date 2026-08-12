type HomeFooterProps = {
  isDark: boolean;
};

export default function HomeFooter({ isDark }: HomeFooterProps) {
  return (
    <footer className="hp-footer">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          System Operational
        </span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
        © 2026 Sigmavalue AI Corp
      </span>
    </footer>
  );
}
