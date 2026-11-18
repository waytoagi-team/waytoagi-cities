"""检查生成结果 hq/：不得有以 / 开头的引用、引用文件必须存在、不得跳出 hq/。"""
import re, sys
from pathlib import Path
from urllib.parse import urlsplit, unquote
dist = Path(__file__).resolve().parent.parent.parent / 'hq'
bad = []
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
        if not target.exists():
            bad.append(f'{f.relative_to(dist)}: 文件不存在 {ref}')
print('\n'.join(bad[:30]) or '检查通过：无绝对路径、无缺失文件、无越界引用')
print('HTML 页面数', len(list(dist.rglob('*.html'))))
sys.exit(1 if bad else 0)
