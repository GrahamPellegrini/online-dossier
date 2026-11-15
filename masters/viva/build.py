#!/usr/bin/env python3
"""Build index.html from src/. Edit slides in src/slides/<slug>.html, order in src/order.txt.
Usage: python3 build.py [--pdf] [--shot slug1,slug2] [--archive]
Slide file: first line is a meta comment <!-- class="slide top" topic="Background | Policy" num="1" -->
num="1" prefixes the ribbon topic with the slide number. Lines after it are the <main> content."""
import re, sys, pathlib
D = pathlib.Path(__file__).parent
SRC = D / 'src'
HDR = ('<header class="ribbon"><div class="ribbon-inner"><img alt="University of Malta" src="assets/UMLOGO_revWHITE.png"/>'
       '<span class="course">MSc AI Dissertation Viva</span><span class="topic">{topic}</span></div></header>')
FOOT = ('<footer class="foot"><span>Learning to Select Actions for Complex Hand Tasks</span>'
        '<span>Graham Pellegrini | University of Malta</span><span>{foot}</span></footer>')

def load(path):
    txt = path.read_text()
    meta, body = txt.split('\n', 1)
    m = dict(re.findall(r'(\w+)="([^"]*)"', meta))
    return m, body

def section(idx, m, body, foot):
    topic = m.get('topic', '')
    if m.get('num') == '1' and foot != 'Backup':
        topic = f"{int(foot[:2])} | {topic}"
    return (f'<section class="{m["class"]}" id="s{idx}"><div class="stage">{HDR.format(topic=topic)}'
            f'<main class="content">{body}</main>{FOOT.format(foot=foot)}</div></section>')

def build(order_file='order.txt', out='index.html', archive=False):
    lines = [l.strip() for l in (SRC / order_file).read_text().splitlines() if l.strip() and not l.startswith('#')]
    cut = lines.index('---backup---') if '---backup---' in lines else len(lines)
    main, backup = lines[:cut], lines[cut + 1:]
    n = len(main)
    folder = SRC / ('archive' if archive else 'slides')
    secs = []
    for i, slug in enumerate(main + backup):
        m, body = load(folder / f'{slug}.html')
        foot = f'{i + 1:02d} / {n}' if i < n else 'Backup'
        secs.append(section(i, m, body, foot))
    head = (SRC / 'head.html').read_text().replace('window.N_MAIN=22', f'window.N_MAIN={n}')
    rail = ''.join(f'<a aria-label="Slide {i + 1}" href="#s{i}"></a>' for i in range(n))
    head = re.sub(r'(<nav aria-label="Slide navigation" class="rail">).*?(</nav>)', lambda mm: mm.group(1) + rail + mm.group(2), head, flags=re.S)
    html = head + ''.join(secs) + (SRC / 'tail.html').read_text()
    if archive:
        html = html.replace('src="assets/', 'src="../assets/').replace('href="assets/', 'href="../assets/').replace('src="prototype-controls.js', 'src="../prototype-controls.js')
    (D / out).write_text(html)
    return main + backup

def run(*args):
    import subprocess
    subprocess.run(['node', str(D / 'render.js'), str(D / 'index.html'), *args], check=True)

if __name__ == '__main__':
    a = sys.argv[1:]
    if '--archive' in a:
        build('archive-order.txt', 'archive/index.html', archive=True); print('archive built')
    order = build()
    print(len(order), 'slides built')
    if '--shot' in a:  # --shot slug1,slug2 -> _shots/NN.png (1x, for checking)
        (D / '_shots').mkdir(exist_ok=True)
        run('shots', str(D / '_shots'), ','.join(str(order.index(s)) for s in a[a.index('--shot') + 1].split(',')))
    if '--pdf' in a:
        run('pdf', str(D / 'viva-deck.pdf')); print('pdf written')
