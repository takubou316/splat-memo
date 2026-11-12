"""wikiから取り出したデータを、アプリ用の contest-data.js にまとめる。"""
import json, sys, re
d = sys.argv[1]
waves_src = json.load(open(d + '/contests.json', encoding='utf-8'))
inst_src = json.load(open(d + '/weapons.json', encoding='utf-8'))

STAGE_ID = {'アラマキ砦':'Q29vcFN0YWdlLTI=', 'ムニ・エール海洋発電所':'Q29vcFN0YWdlLTc=', 'シェケナダム':'Q29vcFN0YWdlLTE=',
            '難破船ドン・ブラコ':'Q29vcFN0YWdlLTY=', 'すじこジャンクション跡':'Q29vcFN0YWdlLTg=',
            'トキシラズいぶし工房':'Q29vcFN0YWdlLTQ=', 'どんぴこ闘技場':'Q29vcFN0YWdlLTk='}
SP_KEY = {'ナイスダマ':'NiceBall','ホップソナー':'ShockSonar','メガホンレーザー5.1ch':'MicroLaser','ジェットパック':'Jetpack',
          'カニタンク':'Chariot','サメライド':'Skewer','トリプルトルネード':'TripleTornado','ウルトラチャクチ':'Pogo','テイオウイカ':'Castle'}
YEAR = {1:2023,2:2023,3:2023,4:2024,5:2024,6:2024,7:2024,8:2025,9:2025,10:2025,11:2025,12:2026,13:2026,14:2026}
# 第10回はwikiの画像名の都合で1本欠けるので補う（otsudori・wikiの開催履歴の本文で確認）
FIX_WEAPONS = {'10': [('ボールドマーカー','ジェットパック'),('シャープマーカー','テイオウイカ'),('デンタルワイパーミント','カニタンク'),('14式竹筒銃・甲','ホップソナー')]}
# 第11・12回は攻略ページが無いので、潮位とイベントのみ（otsudori.com のデータベース記事より）
EXTRA_WAVES = {
  11: [('満潮',''),('通常潮','ラッシュ'),('通常潮',''),('通常潮','キンシャケ探し'),('干潮','')],
  12: [('満潮',''),('満潮','グリル発進'),('干潮','ハコビヤ襲来'),('干潮','ドスコイ大量発生'),('通常潮','')],
}
DANGER = ['60%','120%','180%','240%','300%']; QUOTA = ['10','18','26','30','32']
EVENT_NORM = {'グリル':'グリル発進','昼':''}

def tide(t):
    t = t.strip()
    return {'通常':'通常潮'}.get(t, t)

def bad(cell):
    return '【' in cell or cell.strip() in ('◯', '○', '')

instances = []
for k, v in inst_src.items():
    ws = FIX_WEAPONS.get(k) or [(w['name'], w['sp']) for w in v['weapons']]
    m = re.match(r'(\d+)/(\d+) (\d+:\d+)', v['date'])
    instances.append({'no': v['no'], 'scenario': v['scenario'], 'start': '%d-%s-%s' % (YEAR[v['no']], m.group(1), m.group(2)),
                      'stage': STAGE_ID[v['stage']],
                      'weapons': [{'name': n, 'sp': SP_KEY[s]} for n, s in ws]})

scen = {}
for c in waves_src:
    sid = c['id']
    waves = []
    for i, srow in enumerate(c['summary']):
        w = next((x for x in c['waves'] if x['n'] == i + 1), {'facts': [], 'blocks': []})
        facts = [[a, b] for a, b in w['facts'] if b and not bad(b) and a not in ('キケン度', 'ノルマ')]
        blocks = []
        for b in w['blocks']:
            if b['type'] == 'table':
                rows = [r for r in b['rows'] if any(not bad(x) for x in r) and not any('【' in x for x in r)]
                if rows:
                    blocks.append({'type': 'table', 'caption': b['caption'], 'head': b['head'], 'rows': rows})
            else:
                blocks.append(b)
        ev = EVENT_NORM.get(srow[2], srow[2])
        waves.append({'tide': tide(srow[1]), 'event': ev, 'danger': srow[3], 'quota': srow[4],
                      'max': '' if bad(srow[5]) or srow[5] == '-' else srow[5], 'facts': facts, 'blocks': blocks})
    scen[sid] = {'id': sid, 'waves': waves, 'detail': True}
for sid, ws in EXTRA_WAVES.items():
    scen[sid] = {'id': sid, 'detail': False, 'waves': [{'tide': t, 'event': e, 'danger': DANGER[i], 'quota': QUOTA[i], 'max': '', 'facts': [], 'blocks': []} for i, (t, e) in enumerate(ws)]}

for s in scen.values():
    first = min((x for x in instances if x['scenario'] == s['id']), key=lambda x: x['no'])
    s['stage'] = first['stage']

data = {'source': {'wiki': 'https://wikiwiki.jp/splatoon3mix/サーモンラン/バイトチームコンテスト/攻略', 'db': 'https://otsudori.com/c20250728/'},
        'fetched': '2026-11-12', 'scenarios': [scen[k] for k in sorted(scen)], 'instances': sorted(instances, key=lambda x: x['no'])}
js = '// ばちこん（バイトチームコンテスト）全シナリオのデータ。build_data.py で生成。\n' \
     '// 出典: 有志wiki（wikiwiki.jp/splatoon3mix）の事実データ（表・順番・項目）のみ。解説文は出典リンクで参照する。\n' \
     'window.CONTEST_DATA = ' + json.dumps(data, ensure_ascii=False, indent=0) + ';\n'
open(sys.argv[2], 'w', encoding='utf-8').write(js)
print('scenarios', len(scen), 'instances', len(instances), 'bytes', len(js.encode()))
for s in data['scenarios']:
    print(s['id'], s['stage'], [ (w['tide'], w['event'], sum(len(b.get('rows', b.get('items', []))) for b in w['blocks'])) for w in s['waves']])
