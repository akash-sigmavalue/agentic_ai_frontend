import os
import glob
import re

hook_code = """
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
"""

with open('useLegacyNavigate.js', 'w', encoding='utf-8') as f:
    f.write(hook_code)

jsx_files = glob.glob('**/*.jsx', recursive=True) + glob.glob('**/*.js', recursive=True)

for file in jsx_files:
    if file == 'useLegacyNavigate.js':
        continue
    
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Replace useNavigate import
    content = re.sub(r'import\s*\{\s*useNavigate\s*\}\s*from\s*["\']react-router-dom["\']\s*;?', 
                     'import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";', content)
    
    # Replace combined imports like { Link, useLocation, useNavigate }
    if 'react-router-dom' in content:
        content = content.replace('import { Link, useLocation, useNavigate } from "react-router-dom";',
                                  'import { useLegacyNavigate as useNavigate, useLegacyLocation as useLocation } from "@/components/feasibility_agent/useLegacyNavigate"; import Link from "next/link";')
        content = content.replace('import { Link, useLocation } from "react-router-dom";',
                                  'import { useLegacyLocation as useLocation } from "@/components/feasibility_agent/useLegacyNavigate"; import Link from "next/link";')

    if content != original_content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {file}')

print('Done migration!')
