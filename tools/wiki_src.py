import re, html, sys, os
d = sys.argv[1]
for name in ('contest_src', 'contest_kouryaku_src'):
    t = open(os.path.join(d, name + '.html'), encoding='utf-8').read()
    m = re.search(r'<pre[^>]*><code[^>]*>(.*?)</code></pre>', t, re.S)
    s = html.unescape(m.group(1))
    open(os.path.join(d, name + '.txt'), 'w', encoding='utf-8').write(s)
    print(name, len(s.splitlines()))
    # include / 子ページ参照を探す
    for l in s.splitlines():
        if '#include' in l or 'バイトチームコンテスト/' in l:
            print('  ', l[:160])
