import os
import glob
import re
import json

base_dir = r'D:\RandD_UI\OS Updated\agentic_ai_frontend\components\feasibility_agent'
components_dir = r'D:\RandD_UI\OS Updated\agentic_ai_frontend\components'
package_json_path = r'D:\RandD_UI\OS Updated\agentic_ai_frontend\package.json'

with open(package_json_path, 'r', encoding='utf-8') as f:
    pkg = json.load(f)

deps = set(pkg.get('dependencies', {}).keys()).union(set(pkg.get('devDependencies', {}).keys()))

jsx_files = glob.glob(os.path.join(base_dir, '**', '*.jsx'), recursive=True) + glob.glob(os.path.join(base_dir, '**', '*.js'), recursive=True)

missing_packages = set()
broken_relative = []

for file in jsx_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Match imports
    # import { X } from 'pkg'
    # import X from 'pkg'
    # import 'pkg'
    imports = re.findall(r'import\s+.*?from\s+["\'](.*?)["\']', content)
    imports += re.findall(r'import\s+["\'](.*?)["\']', content)
    
    for imp in imports:
        if imp.startswith('.'): # Relative import
            # Resolve path
            # imp could be ../../AppUtils
            # Note: might be omitting .jsx or .js extension
            current_dir = os.path.dirname(file)
            target_path_base = os.path.normpath(os.path.join(current_dir, imp))
            
            # Check if exists (with or without extension)
            exists = False
            for ext in ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '.css']:
                if os.path.exists(target_path_base + ext):
                    exists = True
                    break
            
            if not exists:
                broken_relative.append((file, imp, target_path_base))
        else:
            # Package import
            # e.g., react-icons/fa -> react-icons
            pkg_name = imp.split('/')[0]
            if pkg_name.startswith('@'):
                # e.g. @deck.gl/react
                parts = imp.split('/')
                if len(parts) > 1:
                    pkg_name = f"{parts[0]}/{parts[1]}"
            
            # exclude alias paths like @/components...
            if pkg_name.startswith('@/') or pkg_name.startswith('~/'):
                continue
                
            if pkg_name not in deps and pkg_name not in ['react', 'next', 'assert', 'path', 'fs', 'crypto']:
                missing_packages.add(pkg_name)

print("MISSING PACKAGES:")
for p in missing_packages:
    print(p)

print("\nBROKEN RELATIVE IMPORTS:")
for f, imp, target in broken_relative:
    rel_f = os.path.relpath(f, base_dir)
    print(f"{rel_f}: {imp}")
