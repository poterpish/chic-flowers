"""Endterm static verification. No writes to the production site or Git history."""
from pathlib import Path
import hashlib, json, re, subprocess
root=Path(__file__).resolve().parents[1]
base=json.loads((root/'evidence/endterm-uploaded-baseline.json').read_text())
for name,expected in base['sha256'].items():
    actual=hashlib.sha256((root/name).read_bytes()).hexdigest()
    assert actual==expected, f'Uploaded-source freeze changed: {name}'
    print('PASS frozen submitted HTML/CSS:',name)
for name in ['index.html','catalog.html','order.html','blog.html']:
    s=(root/name).read_text()
    assert 'jquery-3.7.1.min.js' in s and s.index('jquery-3.7.1.min.js')<s.index('js/main.js'),f'jQuery script order: {name}'
    assert 'old-js-version.js' not in s,f'Unlinked original version must not run: {name}'
    assert 'onclick=' not in s,f'Inline onclick: {name}'
    print('PASS scripts and handlers:',name)
home=(root/'js/home.js').read_text()
assert 'document.createElement(' in home and 'addEventListener(' in home and '$(function' not in home and 'jQuery(' not in home
print('PASS Home gift planner uses Vanilla JavaScript for DOM/events')
for name in ['main','catalog','order','blog']:
    s=(root/'js'/f'{name}.js').read_text()
    code=re.sub(r'/\*.*?\*/|//[^\n]*','',s,flags=re.S)
    assert '$(function () {' in s
    for forbidden in [r'\bdocument\.createElement\(',r'\baddEventListener\(',r'\bgetElementById\(',r'\.classList\b',r'\.style\b',r'\bdocument\.write\(']:
        assert not re.search(forbidden,code),f'Native DOM mixed in jQuery module: js/{name}.js {forbidden}'
    print('PASS jQuery-only interface:',name)
for f in (root/'js').glob('*.js'):
    subprocess.run(['node','--check',str(f)],check=True,stdout=subprocess.DEVNULL)
print('PASS all JavaScript files parsed by Node')
