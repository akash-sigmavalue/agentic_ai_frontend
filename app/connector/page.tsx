import { Suspense } from 'react';
import ConnectorPageClient from './ConnectorPageClient';

export default function ConnectorPage() {
  return (
    <Suspense fallback={null}>
      <ConnectorPageClient />
    </Suspense>
  );
}
