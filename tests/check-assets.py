"""Report actual local image/script/CSS availability without rewriting anything.
Run after merging with the original repository: python3 tests/check-assets.py
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import sys

root = Path(__file__).resolve().parents[1]
references = set()

class AssetParser(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        source = attributes.get('src') if tag in ('img', 'script') else attributes.get('href') if tag == 'link' else None
        if source and not urlsplit(source).scheme:
            references.add(unquote(urlsplit(source).path))

for page in root.glob('*.html'):
    AssetParser().feed(page.read_text())
missing = sorted(source for source in references if not (root / source).is_file())
report = {'passed': not missing, 'checkedReferences': len(references), 'missing': missing,
          'note': 'The Endterm package contains the supplied original img/ and images/ folders; verify new dynamic image paths separately if product data changes.'}
(root / 'evidence/asset-results.json').write_text(json.dumps(report, indent=2) + '\n')
if missing:
    print(f'MISSING: {len(missing)} local resources; retain/restore the original img folder:')
    print('\n'.join(missing))
else:
    print(f'PASS: {len(references)} local asset references exist.')
sys.exit(1 if missing else 0)
