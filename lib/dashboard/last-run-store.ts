export type DashboardLastRun = {
  query: string;
  widget?: string;
};

const STORAGE_KEY = 'sigmavalue_dashboard_last_run';

export const saveDashboardLastRun = (run: DashboardLastRun) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
};

export const loadDashboardLastRun = (): DashboardLastRun | null => {
  if (typeof window === 'undefined') return null;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<DashboardLastRun>;
    if (!parsed.query?.trim()) return null;

    return {
      query: parsed.query.trim(),
      widget: parsed.widget?.trim() || undefined,
    };
  } catch {
    return null;
  }
};
