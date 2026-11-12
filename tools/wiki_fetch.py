import urllib.request, urllib.parse, re, sys, os, html
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
pages = {
  'contest': 'サーモンラン/バイトチームコンテスト',
  'contest_kouryaku': 'サーモンラン/バイトチームコンテスト/攻略',
}
for key, p in pages.items():
    for url in ('https://wikiwiki.jp/splatoon3mix/' + urllib.parse.quote(p),
                'https://wikiwiki.jp/splatoon3mix/::cmd/source?page=' + urllib.parse.quote(p)):
        try:
            b = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=60).read()
            name = key + ('_src' if 'source' in url else '') + '.html'
            open(os.path.join(out, name), 'wb').write(b)
            print('OK', name, len(b))
        except Exception as e:
            print('NG', url, e)
