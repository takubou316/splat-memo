# サーモンラーンNW のマップ画像を取り込む（作者ガンジーさんの許可: 2026-11-17 XのDM「アプリ内（リポジトリ内）に直接画像を取り込んでいただいてまったく問題ございません」）
# 線画SVG（全ステージ）と立体風PNG（5ステージ）は同じ 1016×1016 の枠で重なる。描かれているのは中央の一部なので、
# 潮位ごとに描かれている範囲＋余白で切り抜く（SVGは viewBox を書き換えるだけ＝絵そのものは変えない）
import os, io, re, sys, json, urllib.request
import xml.etree.ElementTree as ET
from PIL import Image

OUT = sys.argv[1]
BB = json.loads(sys.argv[2])  # {"Shakeup_Mid":[x0,y0,x1,y1], ...}（1016の枠での描かれている範囲。ブラウザで測った）
BASE = 'https://salmon-learn-nw.gungee.jp/assets/img/map/'
UA = {'User-Agent': 'Mozilla/5.0 (personal memo app; map import with permission)'}
N = 1016

def get(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code == 404: return None
        raise

os.makedirs(os.path.join(OUT, 'plain'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'model'), exist_ok=True)
manifest = {}
for key, (x0, y0, x1, y1) in BB.items():
    s, t = key.split('_')
    m = max(16, round(max(x1 - x0, y1 - y0) * 0.05))
    cx0, cy0, cx1, cy1 = max(0, x0 - m), max(0, y0 - m), min(N, x1 + 1 + m), min(N, y1 + 1 + m)
    w, h = cx1 - cx0, cy1 - cy0
    svg = get(BASE + 'plain/%s.svg' % key).decode('utf-8')
    # 一番外側の <svg ...> だけを書き換える（元から width/height があるファイルもあるので、消してから付け直す）
    m0 = re.search(r'<svg\b[^>]*>', svg)
    tag = m0.group(0)
    tag2 = re.sub(r'\s(width|height)="[^"]*"', '', tag)
    tag2, n = re.subn(r'viewBox="0 0 1016 1016"', 'viewBox="%d %d %d %d" width="%d" height="%d"' % (cx0, cy0, w, h, w, h), tag2, count=1)
    assert n == 1, key
    svg2 = svg[:m0.start()] + tag2 + svg[m0.end():]
    ET.fromstring(svg2.encode('utf-8'))  # 壊れたXMLになっていないか確かめる
    open(os.path.join(OUT, 'plain', key + '.svg'), 'w', encoding='utf-8', newline='\n').write(svg2)
    model = False
    p = get(BASE + 'model/%s.png' % key)
    if p:
        im = Image.open(io.BytesIO(p)).convert('RGBA')
        k = im.width / N
        im = im.crop((round(cx0 * k), round(cy0 * k), round(cx1 * k), round(cy1 * k)))
        sc = min(1, 2048 / max(im.size))
        if sc < 1: im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
        im.save(os.path.join(OUT, 'model', key + '.webp'), 'WEBP', quality=82, method=6)
        model = True
    manifest[key] = [w, h, 1 if model else 0]
    print(key, w, h, 'model' if model else '-')
json.dump(manifest, open(os.path.join(OUT, 'maps.json'), 'w'), separators=(',', ':'))
