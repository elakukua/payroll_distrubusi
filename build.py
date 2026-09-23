#!/usr/bin/env python3
"""Gabungkan CSS dan JS ke dalam satu index.html siap unggah.
Jalankan setiap kali berkas di assets/ diubah:  python3 build.py"""
import re, sys, os

BASE = os.path.dirname(os.path.abspath(__file__))
def rd(p): return open(os.path.join(BASE, p), encoding='utf-8').read()

html = rd('src/index.src.html') if os.path.exists(os.path.join(BASE, 'src/index.src.html')) else None
if html is None:
    sys.exit('src/index.src.html tidak ditemukan')

css = rd('assets/css/app.css')
js  = [rd('assets/js/%s.js' % n) for n in ('data', 'ui', 'pages', 'app')]

for name, blob, bad in (('CSS', css, '</style>'), ('JS', ''.join(js), '</script>')):
    if bad in blob:
        sys.exit('%s memuat %s — berkas gabungan akan rusak' % (name, bad))

html = html.replace('<link rel="stylesheet" href="assets/css/app.css">', '<style>\n' + css + '\n</style>')
html = html.replace(
    '\n'.join('<script src="assets/js/%s.js"></script>' % n for n in ('data', 'ui', 'pages', 'app')),
    '<script>\n' + '\n'.join(
        '/* ===== %s.js ===== */\n%s' % (n, b) for n, b in zip(('data','ui','pages','app'), js)
    ) + '\n</script>')

html = html.replace('<head>', '''<head>
<!-- =====================================================================
     VERSI SATU BERKAS — seluruh CSS dan JavaScript sudah di dalam sini.
     Cukup unggah berkas ini saja. Tidak butuh folder assets.
     Dihasilkan oleh build.py dari src/index.src.html + assets/
     ===================================================================== -->''')

open(os.path.join(BASE, 'index.html'), 'w', encoding='utf-8').write(html)
print('index.html dibangun ulang — %d KB' % round(len(html) / 1024))
