"""Verify the supplied midterm bytes and forbidden JavaScript constructs.
Run from any directory: python3 tests/verify-freeze.py
The baseline hashes refer to the attached source files, not an unseen Git tag.
"""
from pathlib import Path
import hashlib
import json
import re
import sys

root = Path(__file__).resolve().parents[1]
baseline = json.loads((root / 'evidence/freeze-baseline.json').read_text())
checks = []
for item in baseline['files']:
    target = root / item['path']
    content = target.read_bytes()
    if target.suffix == '.html':
        # These are the only four exact script lines permitted in the final source.
        page = 'home' if target.stem == 'index' else target.stem
        for name in ['data', 'logic', 'main', page]:
            line = f'    <script src="js/{name}.js" defer></script>\n'.encode()
            assert content.count(line) == 1, f'Missing/duplicate deferred script in {target.name}: {name}'
            content = content.replace(line, b'', 1)
    actual = hashlib.sha256(content).hexdigest()
    assert actual == item['sha256'], f'Freeze violation: {item["path"]}'
    checks.append(f'{item["path"]}: frozen bytes unchanged' + (' except deferred script links' if target.suffix == '.html' else ''))

for target in sorted((root / 'js').glob('*.js')):
    source = target.read_text()
    assert source.startswith("'use strict';"), f'Missing strict mode: {target.name}'
    patterns = {
        'var declaration': r'\bvar\s+[\w$]',
        'loose equality': r'(?<![=!])==(?!=)|!=(?!=)',
        'HTML string insertion': r'\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\s*\(',
        'inline styles': r'\.style\b|setAttribute\s*\(\s*[\'\"]style[\'\"]',
        'inline event attribute': r'setAttribute\s*\(\s*[\'\"]on\w+',
        'forbidden execution/output': r'\beval\s*\(|document\.write\s*\(|\balert\s*\('
    }
    for label, pattern in patterns.items():
        assert not re.search(pattern, source), f'{label}: {target.name}'
    checks.append(f'{target.relative_to(root)}: strict mode and prohibited-pattern scan passed')

result = {'passed': True, 'baseline': baseline['description'], 'checks': checks,
          'limitation': 'Static scan complements browser checks. It does not certify an unavailable midterm Git tag or missing photographs.'}
(root / 'evidence/freeze-results.json').write_text(json.dumps(result, indent=2) + '\n')
print('\n'.join(checks))
print(f'PASS: {len(checks)} source/freeze checks')
