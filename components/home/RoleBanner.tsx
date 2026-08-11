import { Shield } from 'lucide-react';

type RoleBannerProps = {
  mounted: boolean;
  user: { username: string; role: string } | null | undefined;
  isAdmin: boolean;
};

export default function RoleBanner({ mounted, user, isAdmin }: RoleBannerProps) {
  if (!mounted || !user) return null;

  return (
    <div className="hp-role-banner">
      <div className="hp-role-card">
        <div className="hp-role-left">
          <div className="hp-role-icon">
            <Shield style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="hp-role-greeting">Welcome back, {user.username}</div>
            <div className="hp-role-sub">
              {isAdmin
                ? 'Administrator Access — You can access all specialized AI agents & Solution workspace.'
                : 'Valuation Agent is enabled for your account. Other agents launching soon.'}
            </div>
          </div>
        </div>
        <span className={`hp-role-badge ${isAdmin ? 'hp-role-badge-admin' : 'hp-role-badge-user'}`}>
          {isAdmin ? 'ADMINISTRATOR' : `${user.role} ACCOUNT`}
        </span>
      </div>
    </div>
  );
}
