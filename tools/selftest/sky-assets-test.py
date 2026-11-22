#!/usr/bin/env python3
"""Check that every selectable sky has one distinct, valid PNG resource."""
from hashlib import sha256
from pathlib import Path
import re
import struct

root = Path(__file__).resolve().parents[2]
source = (root / 'src/main/java/dev/orbit/client/module/impl/render/SkyModule.java').read_text()
registry = source.split('public static final String[][] SKIES = {', 1)[1].split('};', 1)[0]
entries = re.findall(r'\{"([^"]+)",\s*"([^"]+)"\}', registry)
assert entries, 'Sky registry is empty or could not be read'
names = [name for name, _ in entries]
keys = [key for _, key in entries]
assert len(names) == len(set(names)), 'Duplicate sky display names'
assert len(keys) == len(set(keys)), 'Multiple sky names reference the same resource'
expected = {
    ('Anime / Starfall', 'anime'), ('Interstellar', 'interstellar'), ('Blood Moon', 'eclipse'),
    ('Synthwave', 'synthwave'), ('Aurora', 'aurora'), ('Moonlit Aurora', 'moonlit_aurora'),
    ('Nebula', 'nebula'), ('Void', 'void'), ('Clear Day', 'day'),
}
assert expected.issubset(entries), f'Required skies missing or renamed: {expected - set(entries)}'

hashes = set()
for name, key in entries:
    path = root / 'src/main/resources/assets/orbit/textures/gui/sky' / (key + '.png')
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', f'{name}: not a PNG'
    assert data[12:16] == b'IHDR', f'{name}: missing PNG header'
    width, height = struct.unpack('>II', data[16:24])
    assert width >= 4 and height >= 2, f'{name}: image too small'
    digest = sha256(data).digest()
    assert digest not in hashes, f'{name}: image duplicates another sky'
    hashes.add(digest)
print(f'Sky asset test passed: {len(entries)} unique options and PNG files')
