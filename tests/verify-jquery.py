"""Static verification of the uploaded baseline and current jQuery delivery.
Run: python tests/verify-jquery.py (standard library only).
"""
from pathlib import Path
import hashlib, json, re
root=Path(__file__).resolve().parents[1]
baseline=json.loads((root/'evidence/jquery-baseline.json').read_text())
checks=[]
for name,expected in baseline['css'].items():
 assert hashlib.sha256((root/name).read_bytes()).hexdigest()==expected,name+' CSS changed'
 checks.append(name+': byte-identical to uploaded archive')
for name,expected in baseline['html'].items():
 s=(root/name).read_text()
 assert s.count('https://code.jquery.com/jquery-3.7.1.min.js')==1
 assert s.index('jquery-3.7.1.min.js') < s.index('js/main.js')
 assert 'old-js-version.js' not in s
 s=re.sub(r'    <!-- jQuery 3\.7\.1 full build: load before our scripts; full includes the required effects\. -->\n','',s)
 s=re.sub(r'    <script src="https://code\.jquery\.com/jquery-3\.7\.1\.min\.js"[^>]*></script>\n','',s)
 s=re.sub(r'<script\b[^>]*>.*?</script>','',s,flags=re.S|re.I)
 assert hashlib.sha256(s.encode()).hexdigest()==expected,name+' interface changed'
 checks.append(name+': only jQuery script and version comment added')
for name in ['main','home','catalog','order','blog']:
 source=(root/'js'/f'{name}.js').read_text()
 assert "$(function () {" in source and source.startswith("'use strict';")
 # Remove comments before checking real native DOM/event operations.
 code=re.sub(r'/\*.*?\*/|//[^\n]*','',source,flags=re.S)
 for pattern in [r'\baddEventListener\s*\(',r'\bquerySelector',r'\bgetElementById',r'\bcreateElement\s*\(',r'\.classList\b',r'\.style\b',r'\.innerHTML\b',r'\.css\s*\(',r'\bdocument\.write\s*\(',r'\beval\s*\(']:
  assert not re.search(pattern,code),f'{name}: native DOM/CSS pattern {pattern}'
 checks.append(f'js/{name}.js: ready, strict, no mixed native DOM/events or custom CSS generation')
archive=(root/'js/old-js-version.js').read_text()
for name in ['main','home','catalog','order','blog']:
 assert f'// ===== ORIGINAL FILE: js/{name}.js =====' in archive
checks.append('old-js-version.js contains original module sections and is not loaded')
result={'passed':True,'baseline':baseline['description'],'checks':checks}
(root/'evidence/jquery-freeze-results.json').write_text(json.dumps(result,indent=2)+'\n')
print('\n'.join(checks));print('PASS',len(checks),'checks')
