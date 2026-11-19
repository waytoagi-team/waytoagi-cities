"""检查生成结果 hq/：必需页面齐全；不得有以 / 开头的引用；引用文件必须存在；不得跳出 hq/（kit/ 由整站构建提供，允许引用）。"""
import json, re, sys
from pathlib import Path
from urllib.parse import urlsplit, unquote
ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent
dist = REPO / 'hq'
bad = []
cities = json.loads((ROOT / 'data' / 'cities.json').read_text())['cities']
required = ['index.html', 'all/index.html', 'organizers/index.html', 'rules/index.html', 'join/index.html', 'sitemap.xml'] + [f"{c['slug']}/index.html" for c in cities]
if not dist.is_dir():
    print('检查失败：hq/ 不存在，先运行 python3 hq-site/scripts/build.py'); sys.exit(1)
missing = [p for p in required if not (dist / p).is_file()]
if missing:
    print('检查失败：缺少页面', missing[:20]); sys.exit(1)
pat = re.compile(r'''(?:src|href|poster)\s*=\s*"([^"]*)"|url\(\s*['"]?([^'")]+)''')
for f in list(dist.rglob('*.html')) + list(dist.rglob('*.css')):
    for m in pat.finditer(f.read_text()):
        ref = m.group(1) or m.group(2)
        if not ref or ref.startswith(('http:', 'https:', 'data:', '#', 'mailto:', '//')):
            continue
        if ref.startswith('/'):
            bad.append(f'{f.relative_to(dist)}: 绝对路径 {ref}'); continue
        path = unquote(urlsplit(ref).path)
        if not path:
            continue
        target = (f.parent / path).resolve()
        if dist not in target.parents and target != dist:
            bad.append(f'{f.relative_to(dist)}: 跳出 hq 目录 {ref}'); continue
        rel = target.relative_to(dist.resolve())
        if rel.parts and rel.parts[0] == 'kit':
            # 网站根目录的 kit/ 由整站构建从仓库根目录 kit/ 复制
            if not (REPO / rel).exists():
                bad.append(f'{f.relative_to(dist)}: kit 文件不存在 {ref}')
            continue
        if not target.exists():
            bad.append(f'{f.relative_to(dist)}: 文件不存在 {ref}')
print('\n'.join(bad[:30]) or '检查通过：页面齐全，无绝对路径、无缺失文件、无越界引用')
print('HTML 页面数', len(list(dist.rglob('*.html'))))
sys.exit(1 if bad else 0)
