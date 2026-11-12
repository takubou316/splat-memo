import re, json, sys
s = open(sys.argv[1], encoding='utf-8').read()
res = {}
for l in s.splitlines():
    m = re.match(r'\|&aname\(t\d+\);(\d+)\|\[\[([^>]*)>[^\]]*#c(\d+)\]\]\|([^|]*)\|(.*)', l)
    if not m: continue
    n, date, scen, stage, rest = m.groups()
    pairs = re.findall(r'&ref\(icon/([^,]+?)\.png[^)]*\);&ref\(icon/([^,]+?)\.webp', rest)
    res[n] = {'no': int(n), 'date': date, 'scenario': int(scen), 'stage': stage, 'weapons': [{'name': a, 'sp': b} for a, b in pairs]}
json.dump(res, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k, v in res.items():
    print(k, v['scenario'], v['stage'], v['date'], ' / '.join(w['name'] + '(' + w['sp'] + ')' for w in v['weapons']))
