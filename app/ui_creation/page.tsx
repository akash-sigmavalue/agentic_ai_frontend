import { Suspense } from 'react';
import DashboardPage from './dashboard';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DashboardPage />
    </Suspense>
  );
}
