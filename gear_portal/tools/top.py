import json, math, sys
from PIL import Image, ImageDraw
d = json.load(open('/tmp/gate.json'))['frames'][3]
S = 150; W = 900
img = Image.new('RGB', (W, W), (9, 12, 24)); dr = ImageDraw.Draw(img)
for m in sorted(d['meshes'], key=lambda m: m['p'][1] + m['height'] / 2):
    if math.hypot(m['p'][0] - 0.5, m['p'][2] - 0.5) > 2.6: continue
    w, dp, y = m['width'] / 2, m['depth'] / 2, m['r'][1]; c, s = math.cos(y), math.sin(y)
    pts = [(W / 2 + (m['p'][0] - 0.5 + x * c + z * s) * S, W / 2 - (m['p'][2] - 0.5 + z * c - x * s) * S) for x, z in ((-w, -dp), (w, -dp), (w, dp), (-w, dp))]
    dr.polygon(pts, fill=tuple(int(v) for v in m['emissiveColor']))
img.save(sys.argv[1])
