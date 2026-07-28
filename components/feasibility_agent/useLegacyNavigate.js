
import { useRouter, usePathname } from 'next/navigation';

export function useLegacyNavigate() {
  const router = useRouter();
  
  const navigate = (path) => {
    if (path === -1) {
      router.back();
      return;
    }
    
    if (typeof path === 'string') {
        if (path === '/new_rate_simulator' || path === '/new_rate_simulator/') {
             router.push('/feasibility');
        } else if (path.startsWith('/')) {
             // Some paths might already have /feasibility if we're not careful, but let's assume they don't
             if (path.startsWith('/feasibility')) {
                 router.push(path);
             } else {
                 router.push('/feasibility' + path);
             }
        } else {
             router.push(path);
        }
    }
  };
  
  return navigate;
}

export function useLegacyLocation() {
    const pathname = usePathname();
    return { pathname, search: '', hash: '' };
}
