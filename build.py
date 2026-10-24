"""Builds index.html (the GitHub Pages site) from the source files in this folder.
Usage:  python3 build.py
"""
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(here, f), encoding='utf-8').read()
cfg = rd('fbconfig.json').strip() if os.path.exists(os.path.join(here, 'fbconfig.json')) else 'null'
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'index.html')
head = ('<!doctype html>\n<html lang="hr">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="theme-color" content="#1d2b52">\n<title>Briškula</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+SC:wght@500;700&family=Alegreya+Sans:wght@400;500;700&display=swap">\n'
        '<style>' + rd('style.css') + '</style>\n</head>\n<body>\n' + rd('body.html') +
        '\n<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>\n'
        '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>\n'
        '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>\n<script>\n')
files = ['engine.js', 'cloud.js', 'app1.js', 'app2.js', 'app3.js', 'app4.js', 'app6.js', 'app5.js']
js = ''.join(rd(f) + '\n' for f in files).replace('__FBCONFIG__', cfg)
open(out, 'w', encoding='utf-8').write(head + js + '</script>\n</body>\n</html>\n')
print('wrote', out, len(head + js))
