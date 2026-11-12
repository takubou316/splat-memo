"""ティアリスト・ブキメモ用の題材データ（ブキ・ステージ・オオモノの名前と画像URL）を tier-data.js に書き出す。
出典: Leanny/splat3（ゲームデータの解析: WeaponInfoMain.json・言語ファイル・画像）、splatoon3.ink（SplatNetの画像・スケジュール）。
使い方: python tools/build_tier_data.py splat-memo/tier-data.js
"""
import json, urllib.request, hashlib, sys
from concurrent.futures import ThreadPoolExecutor

UA = {'User-Agent': 'Mozilla/5.0'}
VER = '930'
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()
def ok(u):
    try: get(u); return True
    except Exception: return False
H = lambda s: hashlib.sha256(s.encode()).hexdigest()
INK = 'https://assets.splatoon3.ink/splatnet/v3/'
LEANNY = 'https://raw.githubusercontent.com/Leanny/splat3/main/images/'

main = json.loads(get('https://raw.githubusercontent.com/Leanny/splat3/main/data/mush/%s/WeaponInfoMain.json' % VER))
lst = json.loads(get('https://api.github.com/repos/Leanny/splat3/contents/data/language'))
lang = json.loads(get(next(x['download_url'] for x in lst if x['name'] == 'JPja_full.json')))
WNAME = lang['CommonMsg/Weapon/WeaponName_Main']
ENAME = lang['CommonMsg/Coop/CoopEnemy']

def first_ok(urls):
    for u in urls:
        if ok(u): return u
    return ''

def vs_item(w):
    rid = w['__RowId']
    return {'id': rid, 'name': WNAME.get(rid, rid), 'type': rid.split('_')[0],
            'img': first_ok([INK + 'weapon_illust/%s_0.png' % H(rid), LEANNY + 'weapon/Wst_%s.png' % rid])}

def coop_item(w):
    rid = w['__RowId']; base = rid.replace('_Coop', '')
    bear = 'Bear' in rid
    urls = ([LEANNY + 'weapon_flat/Path_Wst_%s.png' % base, LEANNY + 'weapon/Wst_%s.png' % rid] if bear else
            [INK + 'weapon_illust/%s_0.png' % H(base + '_00'), LEANNY + 'weapon/Wst_%s_00.png' % base])
    return {'id': rid, 'name': WNAME.get(rid, rid), 'type': rid.split('_')[0], 'bear': bear, 'img': first_ok(urls)}

vs = [w for w in main if w.get('Type') == 'Versus']
coop = [w for w in main if w.get('Type') == 'Coop']
with ThreadPoolExecutor(16) as ex:
    vs_items = list(ex.map(vs_item, vs))
    coop_items = list(ex.map(coop_item, coop))

# オオモノ11種（スプラ3）。内部名→日本語名は言語ファイルで確認済み
BOSSES = ['SakelienBomber', 'SakelienCupTwins', 'SakelienShield', 'SakelienSnake', 'SakelienTower', 'Sakediver',
          'Sakerocket', 'SakePillar', 'SakeDolphin', 'SakeArtillery', 'SakeSaucer']
boss_items = [{'id': b, 'name': ENAME.get(b, b), 'img': LEANNY + 'coopEnemy/%s.png' % b} for b in BOSSES]

# ステージ: スケジュールAPIの全バトルステージ一覧＋サモラン会場（通常7・ビッグラン6）
sched = json.loads(get('https://splatoon3.ink/data/schedules.json'))
loc = json.loads(get('https://splatoon3.ink/data/locale/ja-JP.json'))
small = lambda u: u.replace('/high_resolution/', '/low_resolution/').replace('_0.png', '_1.png')
vs_stages = [{'id': s['id'], 'name': loc['stages'].get(s['id'], {}).get('name', s['name']), 'img': small(s['originalImage']['url'])}
             for s in sched['data']['vsStages']['nodes']]
COOP = [('Q29vcFN0YWdlLTE=', 'Cop_Shakeup'), ('Q29vcFN0YWdlLTI=', 'Cop_Shakespiral'), ('Q29vcFN0YWdlLTc=', 'Cop_Shakedent'),
        ('Q29vcFN0YWdlLTY=', 'Cop_Shakeship'), ('Q29vcFN0YWdlLTg=', 'Cop_Shakehighway'), ('Q29vcFN0YWdlLTQ=', 'Cop_Shakelift'),
        ('Q29vcFN0YWdlLTk=', 'Cop_Shakerail'), ('Q29vcFN0YWdlLTEwMA==', 'Cop_Carousel'), ('Q29vcFN0YWdlLTEwMg==', 'Cop_Upland'),
        ('Q29vcFN0YWdlLTEwMw==', 'Cop_Temple'), ('Q29vcFN0YWdlLTEwNA==', 'Cop_Factory'), ('Q29vcFN0YWdlLTEwNQ==', 'Cop_Section'),
        ('Q29vcFN0YWdlLTEwNg==', 'Cop_District')]
coop_stages = [{'id': i, 'name': loc['stages'].get(i, {}).get('name', n) + ('（ビッグラン）' if int(n.startswith('Cop_Shake')) == 0 else ''),
                'img': INK + 'stage_img/icon/low_resolution/%s_1.png' % H(n)} for i, n in COOP]

data = {'source': 'Leanny/splat3 (data %s) / splatoon3.ink' % VER, 'built': '2026-11-13',
        'sets': {
          'coopWeapon': {'label': 'サモランのブキ', 'items': coop_items},
          'vsWeapon': {'label': 'バトルのブキ', 'items': vs_items},
          'coopStage': {'label': 'ステージ（サモラン）', 'items': coop_stages},
          'vsStage': {'label': 'ステージ（バトル）', 'items': vs_stages},
          'boss': {'label': 'オオモノシャケ', 'items': boss_items},
        }}
js = ('// ティアリスト・ブキメモ用の題材データ。tools/build_tier_data.py で生成（手で編集しない）\n'
      'window.TIER_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(sys.argv[1], 'w', encoding='utf-8').write(js)
for k, v in data['sets'].items():
    miss = [x['name'] for x in v['items'] if not x['img']]
    print(k, len(v['items']), 'missing img:', miss)
print('bytes', len(js.encode()))
