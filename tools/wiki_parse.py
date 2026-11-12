"""wikiwiki「サーモンラン/バイトチームコンテスト/攻略」のソースから、回ごと・WAVEごとの事実データ（表・箇条書き・項目）を取り出す。
解説の文章は取り込まない（出典へのリンクで参照する）。"""
import re, json, sys, os

src = open(sys.argv[1], encoding='utf-8').read()
out_json, out_txt = sys.argv[2], sys.argv[3]

def clean(s):
    s = s.replace('&br;', ' / ')
    s = re.sub(r'&tooltip\(([^)]*)\)\{([^}]*)\};', r'\1(\2)', s)
    s = re.sub(r'&color\([^)]*\)\{(.*?)\};', r'\1', s)
    s = re.sub(r'&size\([^)]*\)\{(.*?)\};', r'\1', s)
    s = re.sub(r'\[\[([^\]>]*)>[^\]]*\]\]', r'\1', s)
    s = re.sub(r'\[\[([^\]]*)\]\]', r'\1', s)
    s = re.sub(r'\(\((.*?)\)\)', r'（\1）', s)          # 脚注は括弧書きで残す
    s = re.sub(r'(BGCOLOR|COLOR|SIZE)\([^)]*\):', '', s)
    s = re.sub(r'\b(LEFT|CENTER|RIGHT):', '', s)
    s = re.sub(r"'''?", '', s)
    s = re.sub(r'&ref\([^)]*\);', '', s)
    s = re.sub(r'&attachref\([^)]*\);', '', s)
    s = re.sub(r'&#(\d+);', lambda m: chr(int(m.group(1))), s)
    return s.strip()

def split_row(line):
    body = line.strip()
    if body.endswith('|h') or body.endswith('|c') or body.endswith('|f'):
        kind = body[-1]; body = body[:-1]
    else:
        kind = ''
    cells = body.strip('|').split('|')
    return kind, cells

contests = []
blocks = re.split(r'^\*\*第([\d・第回]+)回[^\n]*\[#c(\d+)\]\s*$', src, flags=re.M)
# blocks: [pre, title, id, body, title, id, body, ...]
for i in range(1, len(blocks), 3):
    title, cid, body = blocks[i], blocks[i+1], blocks[i+2]
    body = body.split('\n*バイトチームコンテスト独自')[0]
    lines = [l for l in body.split('\n') if not l.startswith('//')]
    c = {'id': int(cid), 'title': '第' + title + '回', 'summary': [], 'waves': []}
    wave = None; table = None; fold = ''; lst = None
    def end_table():
        global table
    for raw in lines:
        l = raw.rstrip()
        m = re.match(r'#shadowheader\(3,\s*Wave\s*(\d)\s*(.*)\)', l)
        if m:
            wave = {'n': int(m.group(1)), 'head': clean(m.group(2).replace('　', ' ')), 'facts': [], 'blocks': []}
            c['waves'].append(wave); table = None; lst = None; fold = ''
            continue
        mf = re.match(r'#fold\(([^)]*)\)', l)
        if mf:
            fold = clean(mf.group(1)); table = None; lst = None
            continue
        if l.startswith('|'):
            kind, cells = split_row(l)
            if kind == 'c':
                continue
            if wave is None:
                # 回全体の概要表
                if kind == 'h' or cells[0].startswith('~'):
                    continue
                if re.fullmatch(r'\d', cells[0].strip()):
                    c['summary'].append([clean(x) for x in cells])
                continue
            is_head = kind == 'h' or all(x.startswith('~') or x == '>' for x in cells if x)
            if table is None or is_head:
                table = {'caption': fold, 'head': [], 'rows': []}
                wave['blocks'].append({'type': 'table', **table}); table = wave['blocks'][-1]
            if is_head:
                # > は右隣と結合した見出し（中身は2列）
                hd = []
                for x in cells:
                    hd.append('' if x == '>' else clean(x.lstrip('~')))
                # '>'の位置は次の見出し名を引き継ぐ
                for k in range(len(hd) - 1):
                    if cells[k] == '>' :
                        hd[k] = hd[k + 1]; hd[k + 1] = hd[k + 1] + '(詳細)'
                table['head'] = hd
                continue
            prev = table['rows'][-1] if table['rows'] else None
            row = []
            for k, x in enumerate(cells):
                x = x.strip()
                if x == '~' and prev and k < len(prev):
                    row.append(prev[k])
                elif x == '>':
                    row.append('')
                else:
                    row.append(clean(x))
            table['rows'].append(row)
            continue
        table = None
        if wave is None:
            continue
        mk = re.match(r"^-''(.+?)'':(.*)$", l)
        if mk:
            wave['facts'].append([clean(mk.group(1)), clean(mk.group(2))])
            lst = None
            continue
        ml = re.match(r'^\+\s*(.+)$', l)
        if ml:
            if lst is None:
                lst = {'type': 'list', 'caption': fold, 'items': []}
                wave['blocks'].append(lst)
            lst['items'].append(clean(ml.group(1)))
            continue
        if l.strip() == '}}' or l.strip() == '}}}':
            fold = ''
        if not l.strip().startswith('+'):
            lst = None
    contests.append(c)

json.dump(contests, open(out_json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with open(out_txt, 'w', encoding='utf-8') as f:
    for c in contests:
        f.write('=== %s (c%d)\n' % (c['title'], c['id']))
        for s in c['summary']: f.write('  概要 ' + ' | '.join(s) + '\n')
        for w in c['waves']:
            f.write('  -- W%d %s\n' % (w['n'], w['head']))
            for k, v in w['facts']: f.write('     %s: %s\n' % (k, v))
            for b in w['blocks']:
                if b['type'] == 'table':
                    f.write('     [表] %s  見出し=%s  %d行\n' % (b['caption'], b['head'], len(b['rows'])))
                    for r in b['rows'][:3]: f.write('        ' + ' | '.join(r) + '\n')
                else:
                    f.write('     [順] %s %s\n' % (b['caption'], ' → '.join(b['items'])))
print('contests', len(contests))
